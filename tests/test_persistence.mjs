/**
 * Test task persistence module — appendCompletedTask, loadCompletedTasks,
 * findCompletedTask, survive-restart fallback.
 */

import { unlinkSync, existsSync, appendFileSync } from "fs";
import { appendCompletedTask, loadCompletedTasks, findCompletedTask, getTasksFilePath } from "../src/hermes_to_claude/persistence.mjs";

let pass = 0, fail = 0;
function assert(cond, msg) {
  if (cond) { pass++; }
  else { console.error(`FAIL: ${msg}`); fail++; }
}

const TASKS_FILE = getTasksFilePath();

// Clean slate
if (existsSync(TASKS_FILE)) unlinkSync(TASKS_FILE);

// ── 1. No file → empty load ─────────────────────────────────
const empty = loadCompletedTasks();
assert(Array.isArray(empty), "loadCompletedTasks returns array");
assert(empty.length === 0, "no file → empty array");

const notFound = findCompletedTask("nonexistent");
assert(notFound === null, "findCompletedTask on missing file → null");

// ── 2. Append and load ──────────────────────────────────────
const task1 = {
  id: "task_persist_1", prompt: "hello", status: "done",
  result: "world", exitCode: 0,
  usage: { total_cost_usd: 0.01, input_tokens: 10, output_tokens: 20 },
};
appendCompletedTask(task1);

const loaded1 = loadCompletedTasks();
assert(loaded1.length === 1, "1 task loaded");
assert(loaded1[0].id === "task_persist_1", "task id preserved");
assert(loaded1[0].result === "world", "task result preserved");
assert(loaded1[0].usage?.total_cost_usd === 0.01, "usage preserved");
assert(typeof loaded1[0].completedAt === "number", "completedAt timestamp");

// ── 3. Append second task ───────────────────────────────────
const task2 = {
  id: "task_persist_2", prompt: "test 2", status: "failed",
  result: "error msg", exitCode: 1, usage: null,
};
appendCompletedTask(task2);

const loaded2 = loadCompletedTasks();
assert(loaded2.length === 2, "2 tasks loaded");

// ── 4. findCompletedTask ────────────────────────────────────
const found1 = findCompletedTask("task_persist_1");
assert(found1 !== null, "findCompletedTask finds task1");
assert(found1.id === "task_persist_1", "found task id correct");

const found2 = findCompletedTask("task_persist_2");
assert(found2 !== null, "findCompletedTask finds task2");
assert(found2.status === "failed", "found task status correct");

const missing = findCompletedTask("task_does_not_exist");
assert(missing === null, "findCompletedTask returns null for missing task");

// ── 5. Append task with empty fields ─────────────────────────
const task3 = { id: "task_persist_3", prompt: "", status: "done", result: "" };
appendCompletedTask(task3);
const loaded3 = loadCompletedTasks();
const t3 = loaded3.find(t => t.id === "task_persist_3");
assert(t3 !== null, "task with empty fields persisted");
assert(t3.exitCode === null, "exitCode defaults to null");
assert(t3.usage === null, "usage defaults to null");

// ── 6. Guard: null/undefined task doesn't crash ──────────────
appendCompletedTask(null);
appendCompletedTask(undefined);
appendCompletedTask({});
const loaded4 = loadCompletedTasks();
assert(loaded4.length >= 3, "null/undefined tasks don't crash");

// ── 7. Corrupted line doesn't break loading ──────────────────
appendFileSync(TASKS_FILE, "this is not json\n", "utf8");
appendCompletedTask(task1);
const loaded5 = loadCompletedTasks();
// Should still load valid lines
assert(loaded5.length > 0, "valid lines load despite corrupt line");

// ── 8. Survive-restart: find works after simulated restart ───
const savedTask = findCompletedTask("task_persist_1");
assert(savedTask !== null, "survive-restart: task found after simulated restart");
assert(savedTask.result === "world", "survive-restart: result preserved");

// ── 9. File path is in home dir ──────────────────────────────
assert(TASKS_FILE.includes(".h2c") && TASKS_FILE.includes("tasks.jsonl"), "file path is under ~/.h2c/tasks.jsonl");

// ── Cleanup ─────────────────────────────────────────────────
if (existsSync(TASKS_FILE)) unlinkSync(TASKS_FILE);

console.log(`\npersistence: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
