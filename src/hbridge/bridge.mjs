import { spawn } from "child_process";
import { writeFileSync, mkdirSync } from "fs";

const TASKS_DIR = "./hbridge_tasks";

export class Bridge {
  constructor() {
    this.tasks = new Map();
    this._taskIdx = 0;
    mkdirSync(TASKS_DIR, { recursive: true });
  }

  async createTask(prompt, opts = {}) {
    const id = `task_${++this._taskIdx}`;
    const task = {
      id,
      prompt,
      status: "running",
      result: "",
      exitCode: null,
      created: Date.now(),
    };
    this.tasks.set(id, task);
    return { task_id: id, status: "created" };

    // Spawn Claude Code
    const child = spawn("npx", ["@anthropic-ai/claude-code", "-p", prompt], {
      cwd: process.cwd(),
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env },
    });

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
