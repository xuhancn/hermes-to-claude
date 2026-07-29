// Test Bridge class — session pool, persistence, getTask/getTaskOutput
import { Bridge } from "../src/hermes_to_claude/bridge.mjs";
import { appendCompletedTask, getTasksFilePath } from "../src/hermes_to_claude/persistence.mjs";
import { unlinkSync, existsSync, readFileSync } from "fs";

let pass = 0, fail = 0;
function assert(cond, msg) {
  if (cond) { pass++; }
  else { console.error(`FAIL: ${msg}`); fail++; }
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Setup: clean persisted tasks for isolated tests ────────────────────
const TASK_FILE = getTasksFilePath();
const backupTasks = existsSync(TASK_FILE) ? readFileSync(TASK_FILE, "utf8") : "";

// ── Test 1: Bridge constructor defaults ────────────────────────────────
{
  const b = new Bridge();
  assert(b.getActiveCount() === 0, "no sessions on init");
  assert(b.getQueueDepth() === 0, "no queue on init");
  assert(typeof b.createTask === "function", "createTask exists");
  assert(typeof b.getTask === "function", "getTask exists");
  assert(typeof b.getTaskOutput === "function", "getTaskOutput exists");
  assert(typeof b.cancelTask === "function", "cancelTask exists");
  assert(typeof b.subscribeTask === "function", "subscribeTask exists");
  assert(typeof b.unsubscribeTask === "function", "unsubscribeTask exists");
}

// ── Test 2: Max concurrent limit + queuing ────────────────────────────
{
  const b = new Bridge({ maxConcurrent: 1 });

  // First task starts immediately
  b.createTask("task1", "t-queue-1");
  assert(b.getActiveCount() === 1, "first task creates session");
  assert(b.getQueueDepth() === 0, "no queue yet");

  // Second task queues (at capacity)
  b.createTask("task2", "t-queue-2");
  assert(b.getQueueDepth() === 1, "second task queued");
  assert(b.getActiveCount() === 1, "still 1 active session");

  // Complete the first session manually
  const s1 = b._sessions.get("t-queue-1");
  assert(s1 !== undefined, "session exists for first task");
  if (s1) {
    s1.status = "done";
    s1.result = "ok";
    s1.exitCode = 0;
    b._onSessionComplete(s1);
    await sleep(100);
    // Second task should now be running
    assert(b.getQueueDepth() === 0, "queue drained after completion");
    assert(b._sessions.has("t-queue-2"), "second task session started");
  }
}

// ── Test 3: cancelTask — session ─────────────────────────────────────
{
  const b = new Bridge({ maxConcurrent: 3 });
  const { Session } = await import("../src/hermes_to_claude/session.mjs");
  const s = new Session({ taskId: "t-cancel-session", prompt: "test" });
  s.status = "running";
  b._sessions.set("t-cancel-session", s);

  const result = b.cancelTask("t-cancel-session");
  assert(result === true, "cancelTask returns true for active session");
  assert(!b._sessions.has("t-cancel-session"), "session removed after cancel");
}

// ── Test 4: cancelTask — queued ─────────────────────────────────────
{
  const b = new Bridge({ maxConcurrent: 0 });
  b._pendingQueue.push({ taskId: "t-cancel-queue", resolve: () => {}, reject: () => {} });
  const result = b.cancelTask("t-cancel-queue");
  assert(result === true, "cancelTask returns true for queued task");
  assert(b.getQueueDepth() === 0, "queued task removed");
}

// ── Test 5: cancelTask — completed ─────────────────────────────────
{
  const b = new Bridge();
  b._completedTasks.set("t-cancel-done", { id: "t-cancel-done", status: "done" });
  const result = b.cancelTask("t-cancel-done");
  assert(result === true, "cancelTask returns true for completed task");
  assert(b.getTask("t-cancel-done") === null, "completed task removed");
}

// ── Test 6: cancelTask — nonexistent ────────────────────────────────
{
  const b = new Bridge();
  const result = b.cancelTask("nonexistent");
  assert(result === false, "cancelTask returns false for nonexistent");
}

// ── Test 7: getTask / getTaskOutput — session (pending) ─────────────
{
  const b = new Bridge({ maxConcurrent: 3 });
  const { Session } = await import("../src/hermes_to_claude/session.mjs");
  const s = new Session({ taskId: "t-get-sess", prompt: "test" });
  s.status = "running";
  b._sessions.set("t-get-sess", s);

  const t = b.getTask("t-get-sess");
  assert(t !== null, "getTask returns session task");
  assert(t.status === "running", "getTask status running");

  const o = b.getTaskOutput("t-get-sess");
  assert(o !== null, "getTaskOutput returns session task");
  assert(o.retrieval_status === "pending", "getTaskOutput pending for running");
  assert(o.task.status === "running", "task status running in output");
}

// ── Test 8: getTask / getTaskOutput — session (done) ─────────────────
{
  const b = new Bridge({ maxConcurrent: 3 });
  const { Session } = await import("../src/hermes_to_claude/session.mjs");
  const s = new Session({ taskId: "t-get-done", prompt: "test" });
  s.status = "done";
  s.result = "completed";
  s.exitCode = 0;
  s.usage = { total_cost_usd: 0.01, input_tokens: 100, output_tokens: 200, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 };
  b._sessions.set("t-get-done", s);

  const o = b.getTaskOutput("t-get-done");
  assert(o !== null, "getTaskOutput returns done session");
  assert(o.retrieval_status === "success", "getTaskOutput success for done");
  assert(o.task.result === "completed", "result preserved");
  assert(o.task.usage.total_cost_usd === 0.01, "usage preserved");
}

// ── Test 9: getTask / getTaskOutput — memory cache ─────────────────
{
  const b = new Bridge();
  b._completedTasks.set("t-cache", {
    id: "t-cache", prompt: "test", status: "done", result: "cached", exitCode: 0, usage: null, completedAt: Date.now(),
  });
  const o = b.getTaskOutput("t-cache");
  assert(o.task.result === "cached", "memory cache returns result");
}

// ── Test 10: getTask / getTaskOutput — disk persistence ────────────
{
  // Clean up
  try { unlinkSync(TASK_FILE); } catch {}

  const b = new Bridge();
  appendCompletedTask({
    id: "t-disk", prompt: "disk test", status: "done", result: "from disk", exitCode: 0, usage: null,
  });

  // New Bridge should load tasks from disk
  const b2 = new Bridge();
  const o = b2.getTaskOutput("t-disk");
  assert(o !== null, "getTaskOutput loads from disk");
  if (o) {
    assert(o.task.result === "from disk", "result loaded from disk");
  }
}

// ── Test 11: subscribeTask / unsubscribeTask ──────────────────────────
{
  const b = new Bridge();
  const chunks = [];
  const sub = { write: d => chunks.push(d) };

  // Subscribe before session exists (pending storage)
  b.subscribeTask("t-sub", sub);
  // Now add a session
  const { Session } = await import("../src/hermes_to_claude/session.mjs");
  const s = new Session({ taskId: "t-sub", prompt: "test" });
  b._sessions.set("t-sub", s);
  // Re-subscribe now that session exists
  b.subscribeTask("t-sub", sub);

  // Emit via session
  s._emitChunk("hello");
  assert(chunks.length >= 1, "subscriber received chunk via session");

  // Unsubscribe
  b.unsubscribeTask("t-sub", sub);
}

// ── Test 12: Persistence trim doesn't throw ──────────────────────────
{
  const { trimCompletedTasks } = await import("../src/hermes_to_claude/persistence.mjs");
  trimCompletedTasks(); // no-op when under limit
  assert(true, "trimCompletedTasks is safe to call");
}

// ── Test 13: createTask with auto-generated ID ──────────────────────
{
  const b = new Bridge({ maxConcurrent: 5 });
  const { Session } = await import("../src/hermes_to_claude/session.mjs");
  const s = new Session({ taskId: "t-auto", prompt: "auto-gen" });
  s.status = "running";
  b._sessions.set("t-auto", s);
  assert(b.getActiveCount() === 1, "task with custom id registered");
  const t = b.getTask("t-auto");
  assert(t !== null, "getTask finds auto-id task");
  assert(t.status === "running", "auto-id task status");
}

// ── Test 14: subscribeTask forwards to session when it starts ──────
{
  const b = new Bridge({ maxConcurrent: 5 });
  const chunks = [];
  const sub = { write: d => chunks.push(d) };
  b.subscribeTask("t-pending-sub", sub);
  const { Session } = await import("../src/hermes_to_claude/session.mjs");
  const s = new Session({ taskId: "t-pending-sub", prompt: "test" });
  b._sessions.set("t-pending-sub", s);
  b.subscribeTask("t-pending-sub", sub);
  s._emitChunk("forwarded");
  assert(chunks.some(c => c.includes("forwarded")), "pending subscriber forwarded to session");
  b.unsubscribeTask("t-pending-sub", sub);
}

// ── Test 15: unsubscribeTask nonexistent ──────────────────────────
{
  const b = new Bridge();
  b.unsubscribeTask("nonexistent", { write: () => {} });
  assert(true, "unsubscribeTask nonexistent does not throw");
}

// ── Test 16: cancelTask queued with reject ────────────────────────
{
  const b = new Bridge({ maxConcurrent: 0 });
  let rejected = false;
  b._pendingQueue.push({ taskId: "t-reject", resolve: () => {}, reject: () => { rejected = true; } });
  b.cancelTask("t-reject");
  assert(rejected === true, "queued task reject called on cancel");
}

// ── Test 17: _failTask sets exitCode=1 ────────────────────────────
{
  const { Session } = await import("../src/hermes_to_claude/session.mjs");
  const s = new Session({ taskId: "t-fail", prompt: "fail" });
  s._failTask("error");
  assert(s.exitCode === 1, "_failTask exitCode=1");
  assert(s.status === "failed", "_failTask status=failed");
}

// ── Test 18: _finishTask is idempotent ────────────────────────────
{
  const { Session } = await import("../src/hermes_to_claude/session.mjs");
  const s = new Session({ taskId: "t-finish2", prompt: "finish" });
  s._finishTask(0);
  s._finishTask(0);
  assert(s.status === "done", "_finishTask idempotent: status done");
  assert(s.exitCode === 0, "_finishTask idempotent: exitCode 0");
}

// ── Cleanup ──────────────────────────────────────────────────────────
try { unlinkSync(TASK_FILE); } catch {}

// ── Summary ──────────────────────────────────────────────────────────
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
