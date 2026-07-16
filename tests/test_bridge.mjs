// Test Bridge class — getTask / getTaskOutput (no Claude spawn)
import { Bridge } from "../src/hbridge/bridge.mjs";

let pass = 0, fail = 0;
function assert(cond, msg) {
  if (cond) { pass++; }
  else { console.error(`FAIL: ${msg}`); fail++; }
}

const b = new Bridge();

// Bridge starts with no child (lazy spawn)
assert(b.child === null, "no child on init");
assert(b.busy === false, "not busy on init");

// Manually insert a task into _results to test getTask/getTaskOutput
const taskId = "task_test_001";
b._results.set(taskId, { id: taskId, prompt: "test", status: "done", result: "hello world", exitCode: 0 });

const t = b.getTask(taskId);
assert(t !== null, "getTask returns task");
assert(t.id === taskId, "getTask id");
assert(t.status === "done", "getTask status");

const o = b.getTaskOutput(taskId);
assert(o !== null, "getTaskOutput returns");
assert(o.retrieval_status === "success", "getTaskOutput success");
assert(o.task.result === "hello world", "getTaskOutput result");

// Pending task
const pId = "task_test_pending";
b._results.set(pId, { id: pId, prompt: "pending", status: "running", result: "", exitCode: null });

const p = b.getTaskOutput(pId);
assert(p.retrieval_status === "pending", "pending retrieval_status");
assert(p.task.status === "running", "pending status");

// Non-existent task
assert(b.getTask("nonexistent") === null, "nonexistent task null");
assert(b.getTaskOutput("nonexistent") === null, "nonexistent output null");

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
