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
 * When state says "on", also does a quick liveness check via HTTP
 * GET :9190/health. If the server is unreachable (e.g. Claude
 * restarted but state file is stale), falls back to "off" and
 * resets state.
 *
 * Output examples:
 *   hbridge: off
 *   hbridge: on | :9190
 *   hbridge: on | :9190 | 1 pending
 */

import { readState, writeState } from "./state.mjs";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import http from "http";

const INBOX_FILE = join(homedir(), ".hbridge_inbox.json");
const LIVENESS_TIMEOUT = 500; // ms — must be snappy for status bar

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

/** Quick health check — resolves true only if server responds 200. */
function livenessCheck(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}/health`, (res) => {
      let data = "";
      res.on("data", (c) => (data += c.toString()));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data).status === "ok");
        } catch {
          resolve(false);
        }
      });
    });
    req.on("error", () => resolve(false));
    req.setTimeout(LIVENESS_TIMEOUT, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function main() {
  const state = readState();

  // Fast path — state says off
  if (!state.running) {
    console.log("hbridge: off");
    return;
  }

  // State says on — confirm liveness (stale state after Claude restart)
  const alive = await livenessCheck(state.port);
  if (!alive) {
    // Server gone — reset state so next poll is fast
    writeState({ running: false, tasks: 0 });
    console.log("hbridge: off");
    return;
  }

  // Server is alive — show full status
  const parts = [`hbridge: on`, `:${state.port}`];

  const pending = pendingCount();
  if (pending > 0) {
    parts.push(`${pending} pending`);
  }

  console.log(parts.join(" | "));
}

main();
