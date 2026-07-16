import { spawn } from "child_process";
import { createInterface } from "readline";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

const MAX_RESTARTS = 3;
const RESTART_DELAY_MS = 2000;

export class Bridge {
  constructor() {
    this.child = null;
    this.busy = false;
    this.currentTask = null;
    this._results = new Map();
    this._taskResolve = null;
    this._starting = false;      // guard: prevent concurrent spawns
    this._ready = false;         // true when child process is accepting input
    this._restarts = 0;          // consecutive restart count
    // Lazy — no _startClaude here. Spawn happens on first createTask.
  }

  async _startClaude() {
    if (this.child && !this.child.killed) return;
    if (this._starting) {
      // Another createTask is already spawning — wait for it
      while (this._starting) await sleep(200);
      return;
    }

    this._starting = true;
    this._ready = false;

    const isWin = process.platform === "win32";
    const cmd = isWin ? "cmd.exe" : "npx";
    const args = isWin ? ["/d", "/s", "/c", `npx.cmd ${CLAUDE_ARGS.join(" ")}`] : CLAUDE_ARGS;

    this.child = spawn(cmd, args, {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env },
    });

    // Parse NDJSON from stdout — first line signals readiness
    const rl = createInterface({ input: this.child.stdout });
    rl.on("line", (line) => {
      try {
        const msg = JSON.parse(line);
        if (!this._ready) this._ready = true; // first output = process is live
        this._onMessage(msg);
      } catch {}
    });

    this.child.on("error", (err) => {
      this._failTask(`spawn error: ${err.message}`);
      // Do NOT set child = null — prevents infinite respawn
      // _restarts counter handles exhaustion
    });

    this.child.on("close", () => {
      this._failTask("process exited unexpectedly");
      // Same: don't null child, _restarts handles it
    });

    // Wait for the process to be ready (stdin writable + first output)
    await Promise.race([
      new Promise((resolve) => {
        const check = setInterval(() => {
          if (this._ready) { clearInterval(check); resolve(); }
        }, 50);
      }),
      sleep(5000), // timeout: give up after 5s
    ]);

    this._starting = false;
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
    this.currentTask.status = "done";
    this.currentTask.exitCode = exitCode;
    this._results.set(this.currentTask.id, { ...this.currentTask });
    this.busy = false;
    this.currentTask = null;
    if (this._taskResolve) {
      this._taskResolve();
      this._taskResolve = null;
    }
  }

  _failTask(reason) {
    if (!this.currentTask) return;
    this.currentTask.status = "failed";
    this.currentTask.result = reason;
    this._results.set(this.currentTask.id, { ...this.currentTask });
    this.busy = false;
    this.currentTask = null;
    if (this._taskResolve) {
      this._taskResolve();
      this._taskResolve = null;
    }
  }

  async createTask(prompt) {
    const id = `task_${Date.now()}`;

    // Guard: if the child keeps dying, stop after MAX_RESTARTS
    if (this.child && this.child.killed) {
      this._restarts++;
      if (this._restarts > MAX_RESTARTS) {
        this._restarts = 0;
        throw new Error(`Claude process crashed ${MAX_RESTARTS}+ times, giving up`);
      }
    } else if (!this.child) {
      this._restarts = 0;
    }

    // Ensure Claude is running (await spawn + readiness)
    if (!this.child || this.child.killed) {
      await this._startClaude();
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
