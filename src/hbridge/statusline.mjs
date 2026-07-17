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
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { execSync } from "child_process";

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
  const hbStatus = alive ? `▶️ hbridge: on | :${port}` : `⏹️ hbridge: off`;

  // If user has a saved custom statusLine command, run it and attach hbridge status
  const userCmdFile = join(homedir(), ".hbridge_user_statusline_cmd");
  let userPart = "";
  if (existsSync(userCmdFile)) {
    try {
      const cmd = readFileSync(userCmdFile, "utf8").trim();
      if (cmd) userPart = execSync(cmd, { encoding: "utf8", timeout: 2000 }).trim();
    } catch { /* user command failed — skip */ }
  }

  console.log(userPart ? `${userPart} │ ${hbStatus}` : hbStatus);
}

main();
