/**
 * h2c shared state — persisted to ~/.h2c_state.json
 *
 * Written by:
 *   - server.mjs (on HTTP server start/stop)
 *   - mcp.mjs    (on h2c_enable/h2c_disable)
 *
 * Read by:
 *   - statusline.mjs (Claude Code statusLine hook)
 *
 * Format:
 *   { running: bool, port: 9190, users: string[], tasks: int,
 *     startedAt: number (epoch ms), updatedAt: number }
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";

function stateFile() {
  return process.env.H2C_STATE_FILE || join(homedir(), ".h2c_state.json");
}

const DEFAULT_STATE = {
  running: false,
  port: 9190,
  tasks: 0,
  startedAt: 0,
  updatedAt: 0,
  lastClientIP: "",
  lastActiveAt: 0,
};

export function readState() {
  if (!existsSync(stateFile())) return { ...DEFAULT_STATE };
  try {
    return { ...DEFAULT_STATE, ...JSON.parse(readFileSync(stateFile(), "utf8")) };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function writeState(partial) {
  const current = readState();
  const next = { ...current, ...partial, updatedAt: Date.now() };
  writeFileSync(stateFile(), JSON.stringify(next, null, 2));
  return next;
}

export function markRunning(port) {
  return writeState({ running: true, port, startedAt: Date.now(), lastClientIP: "", lastActiveAt: 0 });
}

export function markStopped() {
  return writeState({ running: false, port: 9190, tasks: 0 });
}

export function incrementTasks() {
  const s = readState();
  return writeState({ tasks: s.tasks + 1 });
}

