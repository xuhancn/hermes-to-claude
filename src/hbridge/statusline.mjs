#!/usr/bin/env node
/**
 * hbridge statusline — Claude Code statusLine hook
 *
 * Called periodically by Claude Code via statusLine.command config.
 * Outputs one line to stdout — the first line is displayed in the
 * bottom-right status bar.
 *
 * Reads hbridge_state.json (written by server.mjs / mcp.mjs)
 * and hbridge_inbox.json (written by MCP tools) to build the status.
 *
 * Output examples:
 *   hbridge: off
 *   hbridge: on | :9190
 *   hbridge: on | :9190 | 1 pending
 */

import { readState } from "./state.mjs";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";

const INBOX_FILE = join(homedir(), ".hbridge_inbox.json");

function pendingCount() {
  if (!existsSync(INBOX_FILE)) return 0;
  try {
    const inbox = JSON.parse(readFileSync(INBOX_FILE, "utf8"));
    if (!Array.isArray(inbox)) return 0;
    return inbox.filter((t) => t.status === "pending").length;
  } catch {
    return 0;
  }
}

function main() {
  const state = readState();
  if (!state.running) {
    console.log("hbridge: off");
    return;
  }

  const parts = [`hbridge: on`, `:${state.port}`];

  const pending = pendingCount();
  if (pending > 0) {
    parts.push(`${pending} pending`);
  }

  console.log(parts.join(" | "));
}

main();
