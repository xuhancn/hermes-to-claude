import { spawn } from "child_process";
import { randomUUID } from "crypto";
import { createInterface } from "readline";
import { writeState } from "./state.mjs";

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
  "--verbose",
];

const MAX_RESTARTS = 3;
const RESTART_DELAY_MS = 2000;
const TASK_TIMEOUT_MS = 300_000; // 5 min — kill stuck tasks

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

    // Forward stderr to debug (appears in Claude Code's MCP server log)
    this.child.stderr.on("data", (d) => {
      process.stderr.write(`[claude] ${d.toString()}`);
    });

    // Parse NDJSON from stdout
    let stdoutLines = 0;
    const rl = createInterface({ input: this.child.stdout });
    rl.on("line", (line) => {
      stdoutLines++;
      // Log first 5 lines for debugging
      if (stdoutLines <= 5) {
        process.stderr.write(`[claude:stdout] ${line.slice(0, 200)}\n`);
      }
      try {
        const msg = JSON.parse(line);
        if (!this._ready) this._ready = true;
        this._onMessage(msg);
      } catch (e) {
        if (stdoutLines <= 5) {
          process.stderr.write(`[claude:stdout] parse error: ${e.message}\n`);
        }
      }
    });

    this.child.on("error", (err) => {
      process.stderr.write(`[bridge] spawn error: ${err.message}\n`);
      this._failTask(`spawn error: ${err.message}`);
    });

    this.child.on("close", () => {
      process.stderr.write(`[bridge] Claude process exited\n`);
      this._failTask("Claude process exited");
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
    process.stderr.write(`[bridge:msg] type=${msg.type} subtype=${msg.subtype || "-"} task=${!!this.currentTask}\n`);
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
        } else {
          process.stderr.write(`[bridge] unexpected result subtype: ${msg.subtype}\n`);
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
    writeState({ latestTask: { id: this.currentTask.id, prompt: this.currentTask.prompt, status: "done", exitCode } });
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
    writeState({ latestTask: { id: this.currentTask.id, prompt: this.currentTask.prompt, status: "failed" } });
    this.currentTask = null;
    if (this._taskResolve) {
      this._taskResolve();
      this._taskResolve = null;
    }
  }

  async createTask(prompt, taskId) {
    const id = taskId || `task_${randomUUID()}`;

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
    writeState({ latestTask: { id, prompt, status: "running" } });

    const taskDone = new Promise((resolve) => {
      this._taskResolve = resolve;
    });

    // Send prompt via JSON-RPC
    const msg = JSON.stringify({ type: "user", message: { content: prompt } }) + "\n";
    this.child.stdin.write(msg);

    // Wait for result NDJSON (with timeout to prevent infinite hang)
    const winner = await Promise.race([
      taskDone,
      sleep(TASK_TIMEOUT_MS).then(() => "timeout"),
    ]);

    if (winner === "timeout") {
      process.stderr.write(`[bridge] Task ${id} timed out after ${TASK_TIMEOUT_MS / 1000}s\n`);
      process.stderr.write(`[bridge] Check Claude stderr above for errors\n`);
      this._failTask("timeout");
    }

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
