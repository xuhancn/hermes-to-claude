/**
 * hbridge shared state — persisted to ~/.hbridge_state.json
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
import { join } from "path";
import { homedir } from "os";

const STATE_FILE = join(homedir(), ".hbridge_state.json");
export const INBOX_FILE = join(homedir(), ".hbridge_inbox.json");

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

export function markRunning(port) {
  return writeState({ running: true, port, startedAt: Date.now() });
}

export function markStopped() {
  return writeState({ running: false, port: 9190, tasks: 0 });
}

export function incrementTasks() {
  const s = readState();
  return writeState({ tasks: s.tasks + 1 });
}

// ─── Inbox (task list for statusline) ─────────────────────────────────────

const MAX_INBOX = 20;

export function readInbox() {
  if (!existsSync(INBOX_FILE)) return [];
  try {
    const data = JSON.parse(readFileSync(INBOX_FILE, "utf8"));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function writeInbox(inbox) {
  writeFileSync(INBOX_FILE, JSON.stringify(inbox, null, 2));
}

export function pushToInbox(entry) {
  const inbox = readInbox();
  inbox.push(entry);
  writeInbox(inbox.slice(-MAX_INBOX));
  return inbox;
}

export function updateInbox(id, updates) {
  const inbox = readInbox();
  const idx = inbox.findIndex((t) => t.id === id);
  if (idx !== -1) {
    inbox[idx] = { ...inbox[idx], ...updates };
    writeInbox(inbox);
  }
  return inbox;
}

// ─── Chat log (human-readable conversation for tail -f) ────────────────

const CHAT_LOG = join(homedir(), ".hbridge_chat.log");

export function chatLog(prefix, msg) {
  const time = new Date().toLocaleTimeString();
  const line = `[${time}] ${prefix} ${msg}`;
  try { writeFileSync(CHAT_LOG, line + "\n", { flag: "a" }); } catch {}
}
