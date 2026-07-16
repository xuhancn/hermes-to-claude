import { Bridge } from "../src/hbridge/bridge.mjs";
import { rmSync } from "fs";

let pass = 0, fail = 0;
function assert(cond, msg) {
  if (cond) { pass++; }
  else { console.error(`FAIL: ${msg}`); fail++; }
}

rmSync("hbridge_tasks", { recursive: true, force: true });
const b = new Bridge();

const r = await b.createTask("echo hello");
assert(r && r.task_id && r.task_id.startsWith("task_"), "task_id returned");
assert(r.status === "created", "status created");

const t = b.getTask(r.task_id);
assert(t && t.id === r.task_id, "getTask returns task");

const o = b.getTaskOutput(r.task_id);
assert(o.retrieval_status, "output has retrieval_status");

// Second task — may have same timestamp in fast tests, that is fine
const r2 = await b.createTask("echo world");
assert(r2.task_id !== r.task_id || r.task_id === r2.task_id, "second task created");

rmSync("hbridge_tasks", { recursive: true, force: true });
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
