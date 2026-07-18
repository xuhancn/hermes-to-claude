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
b._results.set(taskId, { id: taskId, prompt: "test", status: "done", result: "hello world", exitCode: 0, usage: null });

const t = b.getTask(taskId);
assert(t !== null, "getTask returns task");
assert(t.id === taskId, "getTask id");
assert(t.status === "done", "getTask status");

const o = b.getTaskOutput(taskId);
assert(o !== null, "getTaskOutput returns");
assert(o.retrieval_status === "success", "getTaskOutput success");
assert(o.task.result === "hello world", "getTaskOutput result");

// Usage null when absent
assert(o.task.usage === null, "getTaskOutput usage null when absent");

// Task with usage data
const usageId = "task_test_usage";
b._results.set(usageId, {
  id: usageId,
  prompt: "usage test",
  status: "done",
  result: "ok",
  exitCode: 0,
  usage: {
    total_cost_usd: 0.01234,
    input_tokens: 150,
    output_tokens: 300,
    cache_creation_input_tokens: 10,
    cache_read_input_tokens: 20,
  },
});

const u = b.getTaskOutput(usageId);
assert(u.task.usage !== null, "usage present");
assert(u.task.usage.total_cost_usd === 0.01234, "usage total_cost_usd");
assert(u.task.usage.input_tokens === 150, "usage input_tokens");
assert(u.task.usage.output_tokens === 300, "usage output_tokens");
assert(u.task.usage.cache_creation_input_tokens === 10, "usage cache_creation");
assert(u.task.usage.cache_read_input_tokens === 20, "usage cache_read");

const tu = b.getTask(usageId);
assert(tu.usage !== null, "getTask usage present");
assert(tu.usage.total_cost_usd === 0.01234, "getTask usage cost");

// Pending task
const pId = "task_test_pending";
b._results.set(pId, { id: pId, prompt: "pending", status: "running", result: "", exitCode: null, usage: null });

const p = b.getTaskOutput(pId);
assert(p.retrieval_status === "pending", "pending retrieval_status");
assert(p.task.status === "running", "pending status");

// Non-existent task
assert(b.getTask("nonexistent") === null, "nonexistent task null");
assert(b.getTaskOutput("nonexistent") === null, "nonexistent output null");

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
