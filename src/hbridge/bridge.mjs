import { spawn } from "child_process";
import { writeFileSync, mkdirSync } from "fs";

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
    const isWin = process.platform === "win32";
    // On Windows, .cmd files can't be spawned directly without shell:true,
    // which triggers a deprecation warning. Use cmd.exe explicitly instead.
    const escapedPrompt = prompt.replace(/"/g, '\\"');
    const cmdLine = `npx.cmd @anthropic-ai/claude-code -p "${escapedPrompt}"`;
    const child = spawn(
      isWin ? "cmd.exe" : "npx",
      isWin ? ["/d", "/s", "/c", cmdLine] : ["@anthropic-ai/claude-code", "-p", prompt],
      {
        cwd: process.cwd(),
        stdio: ["pipe", "pipe", "pipe"],
        env: { ...process.env },
      }
    );

    let output = "";
    child.stdout.on("data", (d) => {
      output += d.toString();
      task.result = output;
    });
    child.stderr.on("data", (d) => {
      output += d.toString();
      task.result = output;
    });

    child.on("close", (code) => {
      task.status = "done";
      task.exitCode = code;
      task.result = output;
      writeFileSync(`${TASKS_DIR}/${id}.txt`, output);
    });

    child.on("error", (err) => {
      task.status = "failed";
      task.result = err.message;
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
