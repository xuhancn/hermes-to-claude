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

import { readState, writeState, readInbox } from "./state.mjs";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import http from "http";

const LIVENESS_TIMEOUT = 500;
const LIVENESS_FILE = join(homedir(), ".hbridge_liveness.json");

// Track consecutive failures — only reset state after 3 failures in a row.
// This prevents a brief port conflict (EADDRINUSE recovery) from flipping
// the status bar to "off" and clearing the task count.
function readFailCount() {
  if (!existsSync(LIVENESS_FILE)) return 0;
  try { return JSON.parse(readFileSync(LIVENESS_FILE, "utf8")).failures || 0; }
  catch { return 0; }
}
function writeFailCount(n) {
  writeFileSync(LIVENESS_FILE, JSON.stringify({ failures: n }));
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
    const failures = readFailCount() + 1;
    if (failures >= 3) {
      // 3 consecutive failures — server is really gone
      writeFailCount(0);
      writeState({ running: false, tasks: 0 });
      console.log("hbridge: off");
    } else {
      writeFailCount(failures);
      // Still show "off" but don't reset state yet
      console.log("hbridge: off");
    }
    return;
  }
  // Liveness OK — reset failure counter
  if (existsSync(LIVENESS_FILE)) writeFailCount(0);

  // Server is alive — show latest Hermes conversation in status bar
  const inbox = readInbox().filter((t) => t.id);
  const latest = inbox[inbox.length - 1];
  const running = inbox.filter((t) => t.status === "running").length;

  const parts = [`hbridge: on`, `:${state.port}`];

  if (latest) {
    const label = latest.status === "running" ? "📨" : "✅";
    const msg = latest.prompt.replace(/\n/g, " ").slice(0, 40);
    parts.push(`${label} "${msg}"`);
    if (running > 0 && running < inbox.length) {
      parts.push(`+${inbox.length - running} done`);
    }
  }

  console.log(parts.join(" | "));
}

main();
