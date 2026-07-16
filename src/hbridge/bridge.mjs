import { spawn } from "child_process";
import { createInterface } from "readline";

/**
 * Bridge — persistent Claude Code process manager.
 *
 * Spawns ONE Claude process with --print --input-format stream-json
 * --output-format stream-json. Tasks sent as JSON-RPC messages via
 * stdin. Results parsed from NDJSON on stdout.
 *
 *   → {"type":"user","message":{"content":"fix bug"}}
 *   ← {"type":"assistant","message":{"content":[{"type":"text","text":"..."}]}}
 *   ← {"type":"result","subtype":"success"}
 */

const CLAUDE_ARGS = [
  "@anthropic-ai/claude-code",
  "--print",
  "--input-format", "stream-json",
  "--output-format", "stream-json",
];

export class Bridge {
  constructor() {
    this.child = null;
    this.busy = false;
    this.currentTask = null;  // {id, prompt, status, result, exitCode}
    this._results = new Map(); // in-memory task results for /task/output
    this._taskResolve = null;  // resolve() for the current task promise
    this._startClaude();
  }

  _startClaude() {
    if (this.child) return;
    const isWin = process.platform === "win32";
    const cmd = isWin ? "cmd.exe" : "npx";
    const args = isWin ? ["/d", "/s", "/c", `npx.cmd ${CLAUDE_ARGS.join(" ")}`] : CLAUDE_ARGS;

    this.child = spawn(cmd, args, {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env },
    });

    this.child.on("error", (err) => {
      this._failTask(`spawn error: ${err.message}`);
      this.child = null;
    });

    this.child.on("close", () => {
      this._failTask("process exited unexpectedly");
      this.child = null;
    });

    const rl = createInterface({ input: this.child.stdout });
    rl.on("line", (line) => {
      try {
        const msg = JSON.parse(line);
        this._onMessage(msg);
      } catch {}
    });
  }

  _onMessage(msg) {
    if (!this.currentTask) return;

    switch (msg.type) {
      case "assistant":
        if (msg.message?.content) {
          for (const block of msg.message.content) {
            if (block.type === "text") {
              this.currentTask.result += block.text;
            }
          }
        }
        break;
      case "result":
        if (msg.subtype === "success") {
          this._finishTask(0);
        }
        break;
    }
  }

  _finishTask(exitCode) {
    if (!this.currentTask) return;
    const t = this.currentTask;
    t.status = "done";
    t.exitCode = exitCode;
    this._results.set(t.id, { ...t });
    this.busy = false;
    this.currentTask = null;
    if (this._taskResolve) {
      this._taskResolve();
      this._taskResolve = null;
    }
  }

  _failTask(reason) {
    if (!this.currentTask) return;
    const t = this.currentTask;
    t.status = "failed";
    t.result = reason;
    this._results.set(t.id, { ...t });
    this.busy = false;
    this.currentTask = null;
    if (this._taskResolve) {
      this._taskResolve();
      this._taskResolve = null;
    }
  }

  async createTask(prompt) {
    const id = `task_${Date.now()}`;

    if (!this.child || this.child.killed) {
      this._startClaude();
    }

    // Queue: wait for previous task to finish
    if (this.busy) {
      await new Promise((resolve) => {
        const check = setInterval(() => {
          if (!this.busy) { clearInterval(check); resolve(); }
        }, 100);
      });
    }

    // Set up current task
    this.currentTask = { id, prompt, status: "running", result: "", exitCode: null };
    this.busy = true;

    const taskDone = new Promise((resolve) => {
      this._taskResolve = resolve;
    });

    // Send prompt via JSON-RPC
    const msg = JSON.stringify({ type: "user", message: { content: prompt } }) + "\n";
    this.child.stdin.write(msg);

    // Wait for result NDJSON
    await taskDone;

    return { task_id: id, status: "created" };
  }

  getTask(taskId) {
    const t = this._results.get(taskId) || (this.currentTask?.id === taskId ? this.currentTask : null);
    if (!t) return null;
    return { id: t.id, status: t.status, created: 0 };
  }

  getTaskOutput(taskId) {
    const t = this._results.get(taskId) || (this.currentTask?.id === taskId ? this.currentTask : null);
    if (!t) return null;
    const done = t.status === "done" || t.status === "failed";
    return {
      retrieval_status: done ? "success" : "pending",
      task: {
        id: t.id,
        status: t.status,
        result: t.result || "",
        exitCode: t.exitCode ?? null,
      },
    };
  }
}
