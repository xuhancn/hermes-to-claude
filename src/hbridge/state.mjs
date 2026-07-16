/**
 * hbridge shared state — persisted to hbridge_state.json
 *
 * Written by:
 *   - server.mjs (on HTTP server start/stop)
 *   - mcp.mjs    (on hbridge_enable/hbridge_disable)
 *
 * Read by:
 *   - statusline.mjs (Claude Code statusLine hook)
 *
 * Format:
 *   { running: bool, port: 9190, users: string[], tasks: int,
 *     startedAt: number (epoch ms), updatedAt: number }
 */

import { readFileSync, writeFileSync, existsSync } from "fs";

const STATE_FILE = "./hbridge_state.json";

const DEFAULT_STATE = {
  running: false,
  port: 9190,
  users: [],
  tasks: 0,
  startedAt: 0,
  updatedAt: 0,
};

export function readState() {
  if (!existsSync(STATE_FILE)) return { ...DEFAULT_STATE };
  try {
    return { ...DEFAULT_STATE, ...JSON.parse(readFileSync(STATE_FILE, "utf8")) };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function writeState(partial) {
  const current = readState();
  const next = { ...current, ...partial, updatedAt: Date.now() };
  writeFileSync(STATE_FILE, JSON.stringify(next, null, 2));
  return next;
}

export function markRunning(port, users = []) {
  return writeState({ running: true, port, users, startedAt: Date.now() });
}

export function markStopped() {
  return writeState({ running: false, port: 9190, users: [], tasks: 0 });
}

export function incrementTasks() {
  const s = readState();
  return writeState({ tasks: s.tasks + 1 });
}
