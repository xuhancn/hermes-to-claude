// Test key persistence: homeKey() must reuse valid key, regenerate on bad state
import { unlinkSync, existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { execSync } from "child_process";
import { homeKey } from "../src/hbridge/home.mjs";

const KEY_FILE = join(homedir(), ".h2c_key");
let pass = 0, fail = 0;

function assert(cond, msg) {
  if (cond) { pass++; }
  else { console.error(`FAIL: ${msg}`); fail++; }
}

// ── Helpers ──────────────────────────────────────────────────────────────

function saveKeyFile() {
  if (existsSync(KEY_FILE)) {
    return readFileSync(KEY_FILE, "utf8");
  }
  return null;
}

function restoreKeyFile(saved) {
  if (saved !== null) {
    writeFileSync(KEY_FILE, saved, "utf8");
  } else if (existsSync(KEY_FILE)) {
    unlinkSync(KEY_FILE);
  }
}

// ── Test 1: Valid hb_ key exists → reuse it ──────────────────────────────

{
  const saved = saveKeyFile();
  const KNOWN = "h2c_UTTestKey123";
  writeFileSync(KEY_FILE, KNOWN, "utf8");

  const result = homeKey(process.cwd());
  assert(result === KNOWN, `Test 1: reuse valid key — expected ${KNOWN}, got ${result}`);

  restoreKeyFile(saved);
}

// ── Test 2: File empty → generate new key ────────────────────────────────

{
  const saved = saveKeyFile();
  writeFileSync(KEY_FILE, "", "utf8");

  const result = homeKey(process.cwd());
  assert(result.startsWith("h2c_"), `Test 2a: key starts with hb_ — got ${result}`);
  assert(result.length > 3, `Test 2b: key has content — length=${result.length}`);

  // File should now contain the new key
  const onDisk = readFileSync(KEY_FILE, "utf8").trim();
  assert(onDisk === result, `Test 2c: file matches returned key — ${onDisk} === ${result}`);

  restoreKeyFile(saved);
}

// ── Test 3: File has garbage → generate new key ──────────────────────────

{
  const saved = saveKeyFile();
  writeFileSync(KEY_FILE, "not_a_valid_key_12345", "utf8");

  const result = homeKey(process.cwd());
  assert(result.startsWith("h2c_"), `Test 3a: key starts with hb_ — got ${result}`);
  assert(result !== "not_a_valid_key_12345", "Test 3b: garbage not returned");

  // File should now contain the new valid key
  const onDisk = readFileSync(KEY_FILE, "utf8").trim();
  assert(onDisk === result, `Test 3c: file overwritten with valid key — ${onDisk}`);

  restoreKeyFile(saved);
}

// ── Test 4: Enable twice → same key (idempotent) ─────────────────────────

{
  const saved = saveKeyFile();
  const KNOWN = "h2c_IdempotentTest";
  writeFileSync(KEY_FILE, KNOWN, "utf8");

  const first = homeKey(process.cwd());
  const second = homeKey(process.cwd());
  assert(first === second, `Test 4: idempotent — ${first} === ${second}`);

  restoreKeyFile(saved);
}

// ── Test 5: Key survives npm test build/run cycle ────────────────────────

{
  const saved = saveKeyFile();
  const KNOWN = "h2c_SurviveNpmTest";
  writeFileSync(KEY_FILE, KNOWN, "utf8");

  // Run the actual npm build + test pipeline as a subprocess
  try {
    execSync("npm run build 2>&1 && npm test 2>&1", {
      cwd: new URL("..", import.meta.url).pathname,
      encoding: "utf8",
      timeout: 30000,
      stdio: "pipe",
    });
  } catch (_) {
    // npm may exit non-zero on test placeholder, but we only care about the key
  }

  // Key must still be the original value
  const afterBuild = readFileSync(KEY_FILE, "utf8").trim();
  assert(afterBuild === KNOWN,
    `Test 5: key survives npm test — expected ${KNOWN}, got ${afterBuild}`);

  restoreKeyFile(saved);
}

// ── Summary ──────────────────────────────────────────────────────────────

console.log(`\nkey_persistence: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
