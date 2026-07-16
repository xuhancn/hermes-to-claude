import { spawn } from "child_process";
import { mkdirSync, writeFileSync } from "fs";

const TASKS_DIR = "./hbridge_tasks";

export class Bridge {
  constructor() {
    this.tasks = new Map();
    this.taskIdx = 0;
    mkdirSync(TASKS_DIR, { recursive: true });
  }

  async createTask(prompt) {
    const id = `task_${++this.taskIdx}`;
    const task = { id, prompt, status: "running", result: "", exitCode: null, created: Date.now() };
    this.tasks.set(id, task);

    // Step 1: save prompt to file (Claude can read it)
    const promptFile = `${TASKS_DIR}/${id}_prompt.txt`;
    writeFileSync(promptFile, prompt);

    // Step 2: spawn Claude Code
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
      task.result = output || "(no output)";
      writeFileSync(`${TASKS_DIR}/${id}.txt`, output || "");
    });

    child.on("error", (err) => {
      task.status = "failed";
      task.result = err.message;
    });

    return { task_id: id, status: "created" };
  }

  getTask(id) {
    const t = this.tasks.get(id);
    return t ? { id: t.id, status: t.status, created: t.created } : null;
  }

  getTaskOutput(id) {
    const t = this.tasks.get(id);
    if (!t) return null;
    return {
      retrieval_status: t.status === "done" ? "success" : t.status === "failed" ? "failed" : "pending",
      task: { id: t.id, status: t.status, result: t.result, exitCode: t.exitCode },
    };
  }
}
