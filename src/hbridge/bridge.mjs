import { spawn } from "child_process";
import { writeFileSync, mkdirSync } from "fs";
import { pushToInbox, updateInbox, chatLog } from "./state.mjs";

const TASKS_DIR = "./hbridge_tasks";

export class Bridge {
  constructor() {
    this.tasks = new Map();
    mkdirSync(TASKS_DIR, { recursive: true });
  }

  async createTask(prompt, opts = {}) {
    const id = `task_${Date.now()}`;
    const task = {
      id,
      prompt,
      status: "running",
      result: "",
      exitCode: null,
      created: Date.now(),
    };
    this.tasks.set(id, task);

    // Spawn Claude Code (async, updates task when done)
    this._spawn(id, prompt);
    return { task_id: id, status: "created" };
  }

  _spawn(id, prompt) {
    const task = this.tasks.get(id);
    if (!task) return;

    // Write to inbox for statusline
    pushToInbox({ id, prompt, status: "running", created: Date.now() });
    chatLog("▶ Hermes → Claude:", prompt.slice(0, 120));

    // Claude CLI expects prompt via stdin with --print flag:
    //   echo "prompt" | npx @anthropic-ai/claude-code --print
    // NOT: npx @anthropic-ai/claude-code -p "prompt"
    const isWin = process.platform === "win32";
    const cmd = isWin ? "cmd.exe" : "npx";
    const args = isWin
      ? ["/d", "/s", "/c", "npx.cmd @anthropic-ai/claude-code --print"]
      : ["@anthropic-ai/claude-code", "--print"];
    const child = spawn(cmd, args, {
      cwd: process.cwd(),
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env },
    });

    // Write prompt via stdin, then close so Claude starts processing
    child.stdin.write(prompt);
    child.stdin.end();

    let output = "";
    child.stdout.on("data", (d) => {
      output += d.toString();
      task.result = output;
    });
    // stderr is also captured for diagnostics
    child.stderr.on("data", (d) => {
      output += d.toString();
      task.result = output;
    });

    child.on("close", (code) => {
      task.status = "done";
      task.exitCode = code;
      task.result = output;
      writeFileSync(`${TASKS_DIR}/${id}.txt`, output);
      updateInbox(id, { status: "done", exitCode: code, result: output, finished: Date.now() });
      chatLog("✅ Claude → Hermes:", `exit:${code} "${output.slice(0, 100)}"`);
    });

    child.on("error", (err) => {
      task.status = "failed";
      task.result = err.message;
      updateInbox(id, { status: "failed", result: err.message, finished: Date.now() });
    });

    return { task_id: id };
  }

  getTask(id) {
    const task = this.tasks.get(id);
    if (!task) return null;
    return {
      id: task.id,
      status: task.status,
      created: task.created,
    };
  }

  getTaskOutput(id) {
    const task = this.tasks.get(id);
    if (!task) return null;
    return {
      retrieval_status: task.status === "done" ? "success" : "pending",
      task: {
        id: task.id,
        status: task.status,
        result: task.result || "",
        exitCode: task.exitCode,
      },
    };
  }
}
