/**
 * Task persistence — saves completed tasks to ~/.h2c_tasks.jsonl
 * for survive-restart. getTaskOutput checks disk if not in memory.
 *
 * Format: JSONL, one JSON object per line:
 *   {"id":"task_xxx","prompt":"...","status":"done","result":"...",...}
 *
 * The file is append-only and self-healing: corrupt lines are skipped
 * on read. A cap prevents unbounded growth.
 */

import { readFileSync, appendFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";

const TASKS_FILE = join(homedir(), ".h2c_tasks.jsonl");

/** @type {number} Maximum persisted tasks before trimming. */
const MAX_TASKS = 2000;

/**
 * Append a completed/failed task to the JSONL file.
 * @param {object} task - Task object from Bridge._results
 */
export function appendCompletedTask(task) {
  if (!task || !task.id) return;
  const record = {
    id: task.id,
    prompt: task.prompt || "",
    status: task.status || "unknown",
    result: task.result || "",
    exitCode: task.exitCode ?? null,
    usage: task.usage ?? null,
    completedAt: Date.now(),
  };
  try {
    appendFileSync(TASKS_FILE, JSON.stringify(record) + "\n", "utf8");
  } catch (e) {
    process.stderr.write(`[persistence] append error: ${e.message}\n`);
  }
}

/**
 * Load all completed tasks from the JSONL file.
 * Skips corrupt lines gracefully.
 * @returns {object[]}
 */
export function loadCompletedTasks() {
  if (!existsSync(TASKS_FILE)) return [];
  try {
    const content = readFileSync(TASKS_FILE, "utf8");
    const tasks = [];
    for (const line of content.split("\n").filter(Boolean)) {
      try {
        tasks.push(JSON.parse(line));
      } catch {
        // skip corrupt lines
      }
    }
    return tasks;
  } catch {
    return [];
  }
}

/**
 * Find a completed task by ID. Returns null if not found.
 * Reads the entire JSONL — efficient for modest file sizes.
 * @param {string} taskId
 * @returns {object|null}
 */
export function findCompletedTask(taskId) {
  if (!existsSync(TASKS_FILE)) return null;
  try {
    const content = readFileSync(TASKS_FILE, "utf8");
    for (const line of content.split("\n").filter(Boolean)) {
      try {
        const task = JSON.parse(line);
        if (task.id === taskId) return task;
      } catch {
        // skip corrupt lines
      }
    }
  } catch {
    // ignore read errors
  }
  return null;
}

/**
 * Get the path to the tasks file (for test inspection).
 * @returns {string}
 */
export function getTasksFilePath() {
  return TASKS_FILE;
}

/**
 * Trim the tasks file to prevent unbounded growth.
 * Keeps only the most recent MAX_TASKS entries.
 * Safe to call periodically (it's a no-op when under limit).
 */
export function trimCompletedTasks() {
  if (!existsSync(TASKS_FILE)) return;
  try {
    const content = readFileSync(TASKS_FILE, "utf8");
    const lines = content.split("\n").filter(Boolean);
    if (lines.length <= MAX_TASKS) return;
    const trimmed = lines.slice(lines.length - MAX_TASKS);
    writeFileSync(TASKS_FILE, trimmed.join("\n") + "\n", "utf8");
    process.stderr.write(`[persistence] trimmed ${lines.length - trimmed.length} tasks (${trimmed.length} kept)\n`);
  } catch {
    // ignore trim errors
  }
}
