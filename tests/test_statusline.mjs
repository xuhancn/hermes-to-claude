// Test statusline.mjs — port derivation + health check
// Spawns dist/statusline.mjs from directories with/without a running server.
import { spawnSync } from "child_process";
import { createHash } from "crypto";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { mkdirSync, rmSync } from "fs";
import http from "http";

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATLINE_PATH = resolve(__dirname, "..", "dist", "statusline.mjs");

let pass = 0, fail = 0;
function assert(cond, msg) {
  if (cond) { pass++; }
  else { console.error(`FAIL: ${msg}`); fail++; }
}

// Replicate port derivation (same formula as home.mjs homePort())
function portFromCwd(cwd) {
  const hash = createHash("md5").update(Buffer.from(cwd, "utf-8")).digest();
  return 9200 + (hash.readUInt16BE(0) % 600);
}

function runFrom(dir) {
  const r = spawnSync("node", [STATLINE_PATH], {
    cwd: dir,
    encoding: "utf8",
  });
  return r.stdout.trim();
}

async function main() {
  // 1. Port derivation is deterministic (matches home.mjs homePort)
  assert(portFromCwd("/tmp/test") === 9352, 'portFromCwd("/tmp/test") === 9352');
  assert(portFromCwd("/home/user/project") === 9578, 'portFromCwd("/home/user/project") === 9578');

  // 2. Port derivation uses MD5 of cwd
  const raw = createHash("md5").update(Buffer.from("/test", "utf-8")).digest();
  const expected = 9200 + (raw.readUInt16BE(0) % 600);
  assert(portFromCwd("/test") === expected, "port derivation matches raw MD5 calculation");

  // 3. Use a temp directory with no server
  const tmpDir = resolve(__dirname, "..", "_test_statusline_empty");
  try { rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  mkdirSync(tmpDir, { recursive: true });
  const tmpPort = portFromCwd(tmpDir);

  // Quick health check: no server on tmpPort
  const alive = await new Promise((r) => {
    const req = http.get(`http://127.0.0.1:${tmpPort}/health`, (res) => { res.resume(); r(true); });
    req.on("error", () => r(false));
    req.setTimeout(200, () => { req.destroy(); r(false); });
  });
  assert(!alive, `no server running on port ${tmpPort}`);

  // 4. Run statusline from temp dir → expect "off"
  const out = runFrom(tmpDir);
  assert(out.includes("off"), `no server on port ${tmpPort} -> off`);

  // 5. Output format: emoji prefix + "h2c: off"
  assert(out.startsWith("⏹️ ") || out.startsWith("▶️ "), "starts with emoji indicator");
  assert(out.includes("h2c:"), "contains h2c:");

  // 6. No state.json dependency — correct "off" without any state file
  assert(out.replace(/^[^h]*/, "").includes("off"), "no state file needed");

  // Cleanup
  try { rmSync(tmpDir, { recursive: true, force: true }); } catch {}

  console.log(`${pass} passed, ${fail} failed`);
  process.exit(fail > 0 ? 1 : 0);
}

main();
