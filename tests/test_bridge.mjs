// Test Bridge class — getTask / getTaskOutput (no Claude spawn)
import { Bridge, BridgeManager } from "../src/hbridge/bridge.mjs";
import { unlinkSync, existsSync } from "fs";
import { getTasksFilePath } from "../src/hbridge/persistence.mjs";

let pass = 0, fail = 0;
function assert(cond, msg) {
  if (cond) { pass++; }
  else { console.error(`FAIL: ${msg}`); fail++; }
}

// ── Bridge tests (existing) ─────────────────────────────────────────
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

// ── BridgeManager tests ─────────────────────────────────────────────

const PERSIST_FILE = getTasksFilePath();

function cleanupPersist() {
  if (existsSync(PERSIST_FILE)) unlinkSync(PERSIST_FILE);
}

// Test 1: BridgeManager creates default session
const bm = new BridgeManager();
assert(bm.getSessions().length === 1, "1 session by default");
assert(bm.getSessions()[0] === "default", "default session exists");

// Test 2: getTask delegates to default session
const defaultBridge = bm._sessions.get("default");
defaultBridge._results.set("bm_task_1", {
  id: "bm_task_1", prompt: "bm1", status: "done",
  result: "bridge manager ok", exitCode: 0, usage: null,
});
const bm_t = bm.getTask("bm_task_1");
assert(bm_t !== null, "BridgeManager getTask finds task");
assert(bm_t.status === "done", "BridgeManager getTask status");

const bm_o = bm.getTaskOutput("bm_task_1");
assert(bm_o !== null, "BridgeManager getTaskOutput finds task");
assert(bm_o.task.result === "bridge manager ok", "BridgeManager getTaskOutput result");

// Test 3: getSession creates new Bridge
const session2 = bm._getOrCreateSession("quick-session");
assert(bm.getSessions().length === 2, "2 sessions after creating quick-session");
assert(session2 instanceof Bridge, "new session returns Bridge");
assert(session2._sessionId === "quick-session", "session ID set on Bridge");

// Test 4: Different sessions are independent
session2._results.set("bm_task_2", {
  id: "bm_task_2", prompt: "bm2", status: "done",
  result: "quick result", exitCode: 0, usage: null,
});
// Default session doesn't see session2's task
assert(bm.getTask("bm_task_2") !== null, "BridgeManager finds task across sessions");

// Test 5: Non-existent task returns null
assert(bm.getTask("nonexistent") === null, "BridgeManager getTask nonexistent");
assert(bm.getTaskOutput("nonexistent") === null, "BridgeManager getTaskOutput nonexistent");

// Test 6: Session-specific lookup
assert(bm.getTask("bm_task_2", { sessionId: "quick-session" }) !== null,
  "session-specific getTask finds task");
assert(bm.getTask("bm_task_2", { sessionId: "default" }) === null,
  "wrong session returns null for getTask");

assert(bm.getTaskOutput("bm_task_2", { sessionId: "quick-session" }) !== null,
  "session-specific getTaskOutput finds task");
assert(bm.getTaskOutput("bm_task_2", { sessionId: "default" }) === null,
  "wrong session returns null for getTaskOutput");

// Test 7: getTask falls back to persisted tasks
cleanupPersist();
const { appendCompletedTask } = await import("../src/hbridge/persistence.mjs");
appendCompletedTask({
  id: "persisted_task",
  prompt: "persisted",
  status: "done",
  result: "from disk",
  exitCode: 0,
  usage: { total_cost_usd: 0.01, input_tokens: 10, output_tokens: 20 },
});

const pt = bm.getTask("persisted_task");
assert(pt !== null, "BridgeManager getTask falls back to persisted task");
if (pt) {
  assert(pt.status === "done", "persisted task status correct");
  assert(pt.usage?.total_cost_usd === 0.01, "persisted task usage correct");
}

const po = bm.getTaskOutput("persisted_task");
assert(po !== null, "BridgeManager getTaskOutput falls back to persisted task");
if (po) {
  assert(po.task.result === "from disk", "persisted task output correct");
  assert(po.retrieval_status === "success", "persisted task retrieval_status success");
}

// Test 8: cancelTask across sessions
const resultSession = bm._getOrCreateSession("cancel-session");
resultSession._results.set("bm_cancel_1", {
  id: "bm_cancel_1", prompt: "cancel me", status: "running",
  result: "", exitCode: null, usage: null,
});
const cancelled = bm.cancelTask("bm_cancel_1");
assert(cancelled === true, "BridgeManager cancelTask returns true");
assert(resultSession.getTask("bm_cancel_1") === null, "task removed from session after cancel");

// Test 9: cancelTask with specific session
resultSession._results.set("bm_cancel_2", {
  id: "bm_cancel_2", prompt: "cancel session", status: "running",
  result: "", exitCode: null, usage: null,
});
const cancelledSpecific = bm.cancelTask("bm_cancel_2", { sessionId: "cancel-session" });
assert(cancelledSpecific === true, "cancelTask with sessionId returns true");

// Test 10: cancelTask wrong session returns false
const wrongCancel = bm.cancelTask("nonexistent");
assert(wrongCancel === false, "cancelTask nonexistent returns false");

// Test 11: subscribeTask / unsubscribeTask
const bm2 = new BridgeManager();
const events = [];
const sub = { write: (d) => events.push(d) };
bm2.subscribeTask("sub-task-1", sub);
// Sub should be on default session
assert(bm2._pendingTaskSubs?.has("sub-task-1"), "pending subscribers tracked");
assert(bm2._sessions.get("default")._taskSubscribers.has("sub-task-1"),
  "subscriber wired to default session");

bm2.unsubscribeTask("sub-task-1", sub);
assert(!bm2._pendingTaskSubs?.has("sub-task-1") || bm2._pendingTaskSubs.get("sub-task-1").size === 0,
  "pending subscribers cleaned after unsubscribe");

// Cleanup persisted file
cleanupPersist();

// ── Summary ──────────────────────────────────────────────────────────
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
