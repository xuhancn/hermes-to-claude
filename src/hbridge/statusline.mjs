#!/usr/bin/env node
/**
 * hbridge statusline — Claude Code statusLine hook
 *
 * Called periodically by Claude Code via statusLine.command config.
 * Outputs one line to stdout which Claude displays in the bottom-right status bar.
 *
 * Checks:
 *   - HTTP GET localhost:9190/health → hbridge on/off
 *   - hbridge_inbox.json exists → pending task count
 *
 * Output: "hbridge: on | :9190" or "hbridge: on | :9190 | 1 pending" or "hbridge: off"
 */

import http from "http";
import { readFileSync, existsSync } from "fs";

const PORT = 9190;
const HEALTH_URL = `http://localhost:${PORT}/health`;
const INBOX_FILE = "./hbridge_inbox.json";

/**
 * Health check via HTTP GET :9190/health.
 * Returns true if server responds with {"status":"ok"}.
 */
function healthCheck() {
  return new Promise((resolve) => {
    const req = http.get(HEALTH_URL, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk.toString()));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data).status === "ok");
        } catch {
          resolve(false);
        }
      });
    });
    req.on("error", () => resolve(false));
    req.setTimeout(2000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

/**
 * Count pending tasks in hbridge_inbox.json.
 * Returns 0 if file doesn't exist or is unparseable.
 */
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

async function main() {
  const on = await healthCheck();
  if (!on) {
    console.log("hbridge: off");
    return;
  }

  const pending = pendingCount();
  if (pending > 0) {
    console.log(`hbridge: on | :${PORT} | ${pending} pending`);
  } else {
    console.log(`hbridge: on | :${PORT}`);
  }
}

main();
