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
import http from "http";

const LIVENESS_TIMEOUT = 500; // ms — must be snappy for status bar

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

  // Server is alive — show task summary from inbox
  const inbox = readInbox().filter((t) => t.id); // only real tasks
  const total = inbox.length;
  const running = inbox.filter((t) => t.status === "running").length;
  const done = inbox.filter((t) => t.status === "done").length;

  const parts = [`hbridge: on`, `:${state.port}`];
  if (total > 0) {
    parts.push(`${total} tasks`);
    if (running > 0) parts.push(`${running} running`);
    else parts.push(`${done} done`);
  }

  console.log(parts.join(" | "));
}

main();
