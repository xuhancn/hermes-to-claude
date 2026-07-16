import { Bridge } from "../src/hbridge/bridge.mjs";
import { existsSync, readFileSync } from "fs";
import { rmSync } from "fs";

let pass = 0, fail = 0;
function assert(cond, msg) {
  if (cond) { pass++; }
  else { console.error(`FAIL: ${msg}`); fail++; }
}

rmSync("hbridge_tasks", { recursive: true, force: true });

const b = new Bridge();

// Create — returns task_id
const r = b.createTask("echo hello");
assert(r.task_id && r.task_id.startsWith("task_"), "task_id returned");
assert(r.status === "created", "status created");

// Get — returns status
const t = b.getTask(r.task_id);
assert(t && t.id === r.task_id, "getTask returns task");
assert(t.status === "running" || t.status === "done" || t.status === "failed", "valid status");

// Output — before completion
const o = b.getTaskOutput(r.task_id);
assert(o.retrieval_status, "output has retrieval_status");

// Multiple tasks
const r2 = b.createTask("echo world");
assert(r2.task_id !== r.task_id, "unique task IDs");

rmSync("hbridge_tasks", { recursive: true, force: true });
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
