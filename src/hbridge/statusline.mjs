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
import http from "http";

/** Quick health check — resolves true if server responds 200. */
function livenessCheck(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}/health`, (res) => {
      let data = "";
      res.on("data", (c) => (data += c.toString()));
      res.on("end", () => {
        try { resolve(JSON.parse(data).status === "ok"); }
        catch { resolve(false); }
      });
    });
    req.on("error", () => resolve(false));
    req.setTimeout(500, () => { req.destroy(); resolve(false); });
  });
}

async function main() {
  const state = readState();
  if (!state.running) {
    console.log("⏹️ hbridge: off");
    return;
  }

  const alive = await livenessCheck(state.port);
  if (!alive) {
    writeState({ running: false, tasks: 0 });
    console.log("⏹️ hbridge: off");
    return;
  }

  const parts = [`▶️ hbridge: on`, `:${state.port}`];
  if (state.latestTask) {
    const icon = state.latestTask.status === "running" ? "📨" : state.latestTask.exitCode === 0 ? "✅" : "❌";
    const msg = state.latestTask.prompt.replace(/\n/g, " ").slice(0, 30);
    parts.push(`${icon}"${msg}"`);
  }
  console.log(parts.join(" | "));
}

main();
