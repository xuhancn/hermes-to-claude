#!/usr/bin/env node
/**
 * hbridge statusline — Claude Code statusLine hook
 *
 * Called periodically by Claude Code via statusLine.command config.
 * Outputs one line to stdout — the first line is displayed in the
 * bottom-right status bar.
 *
 * Determines the port from the working directory (same deterministic
 * formula as home.mjs homePort()) and polls the health endpoint.
 * No state-file dependency — always reflects actual server liveness
 * for the current directory.
 *
 * This avoids the v2 port-per-directory issue where state.json
 * holds a stale port from a different directory or session.
 *
 * Output examples:
 *   ⏹️ hbridge: off
 *   ▶️ hbridge: on | :9761
 */

import { createHash } from "crypto";
import http from "http";

/** Deterministic port matching home.mjs homePort(). */
function portFromCwd(cwd) {
  const hash = createHash("md5").update(Buffer.from(cwd, "utf-8")).digest();
  return 9200 + (hash.readUInt16BE(0) % 600);
}

/** Quick health check — resolves true if server responds {"status":"ok"}. */
function livenessCheck(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/health`, (res) => {
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
  const port = portFromCwd(process.cwd());
  const alive = await livenessCheck(port);

  if (!alive) {
    console.log("⏹️ hbridge: off");
    return;
  }

  console.log(`▶️ hbridge: on | :${port}`);
}

main();
