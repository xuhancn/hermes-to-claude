// Test home.mjs — isHome() + homePort()
import { isHome, homePort } from "../src/hbridge/home.mjs";

let pass = 0, fail = 0;
function assert(cond, msg) {
  if (cond) { pass++; }
  else { console.error(`FAIL: ${msg}`); fail++; }
}

const saved = process.env.HBRIDGE_HOME;

// ═══════════════════════════════════════════════════════════════
// isHome()
// ═══════════════════════════════════════════════════════════════

// 1) isHome() returns true when HBRIDGE_HOME=1
process.env.HBRIDGE_HOME = "1";
assert(isHome() === true, "HBRIDGE_HOME=1 -> true");

// 2) isHome() false otherwise
delete process.env.HBRIDGE_HOME;
assert(isHome() === false, "unset -> false");

process.env.HBRIDGE_HOME = "0";
assert(isHome() === false, "HBRIDGE_HOME=0 -> false");

process.env.HBRIDGE_HOME = "true";
assert(isHome() === false, "HBRIDGE_HOME=true -> false");

process.env.HBRIDGE_HOME = "false";
assert(isHome() === false, "HBRIDGE_HOME=false -> false");

process.env.HBRIDGE_HOME = "";
assert(isHome() === false, "HBRIDGE_HOME='' -> false");

process.env.HBRIDGE_HOME = "yes";
assert(isHome() === false, "HBRIDGE_HOME=yes -> false");

process.env.HBRIDGE_HOME = "2";
assert(isHome() === false, "HBRIDGE_HOME=2 -> false (strict ==1)");

// NOTE: == coerces ' 1' and '1 ' to numeric 1, so those are truthy.
// Only exact non-"1" strings are truly false.

// Restore for port tests
process.env.HBRIDGE_HOME = saved;

// ═══════════════════════════════════════════════════════════════
// homePort() — range
// ═══════════════════════════════════════════════════════════════

// 3) homePort returns 9200-9799
const TEST_PATHS = [
  "/",
  "/a",
  "/tmp",
  "/home/user/project",
  "/var/log/app",
  "/data/db/collection",
  "C:\\Users\\test\\project",
  "D:\\xu_git\\hermes-claude-bridge",
  "/very/long/path/that/should/work/fine/without/any/issues",
  "/unicode/路径/测试",
  "/mixed/Case/PATH/test",
  "/a/b/c/d/e/f/g/h/i/j/k/l/m/n/o/p",
  "",
  "single_component",
  ".",
  "..",
  "/with spaces in path",
  "/with-hyphens_and_underscores/混合",
];

for (const p of TEST_PATHS) {
  const port = homePort(p);
  assert(Number.isInteger(port), `homePort(${JSON.stringify(p)}) is integer`);
  assert(port >= 9200 && port <= 9799, `homePort(${JSON.stringify(p)}) in [9200,9799] got ${port}`);
}

// ═══════════════════════════════════════════════════════════════
// homePort() — deterministic (same cwd → same port)
// ═══════════════════════════════════════════════════════════════

// 4 + 6) same cwd → same port every time
for (const dir of TEST_PATHS) {
  const first = homePort(dir);
  for (let i = 0; i < 10; i++) {
    assert(homePort(dir) === first, `homePort(${JSON.stringify(dir)}) deterministic call ${i}`);
  }
}

// ═══════════════════════════════════════════════════════════════
// homePort() — different cwd → likely different port
// ═══════════════════════════════════════════════════════════════

// 5) Different paths should produce varied ports
const portSet = new Set(TEST_PATHS.map(homePort));
assert(portSet.size >= Math.min(TEST_PATHS.length * 0.7, 600), `port diversity: ${portSet.size} unique from ${TEST_PATHS.length} paths`);
// At least 70% of test paths should yield a unique port
// (17 test paths × 0.7 ≈ 12 unique expected; with 600 slots this is extremely likely)

// ═══════════════════════════════════════════════════════════════
// homePort() — edge cases
// ═══════════════════════════════════════════════════════════════

// Empty string should still produce a valid port
const emptyPort = homePort("");
assert(Number.isInteger(emptyPort), "empty string produces integer port");
assert(emptyPort >= 9200 && emptyPort <= 9799, "empty string port in range");

// Verify full port space can be covered
const FULL_COVERAGE = 600; // exactly 600 slots
const coverage = new Set();
for (let i = 0; i < FULL_COVERAGE * 10; i++) {
  coverage.add(homePort(`/coverage/path/${i}`));
}
// With 6000 samples across 600 slots, should see nearly all slots
assert(coverage.size > 500, `port space coverage: ${coverage.size}/600 slots`);

// Verify that homePort uses MD5 (32 hex chars)
import { createHash } from "crypto";
for (const dir of ["/a", "/b", "/test"]) {
  const raw = createHash("md5").update(Buffer.from(dir, "utf-8")).digest();
  const expectedPort = 9200 + (raw.readUInt16BE(0) % 600);
  assert(homePort(dir) === expectedPort, `homePort(${JSON.stringify(dir)}) matches raw MD5 calculation`);
}

// Cleanup
process.env.HBRIDGE_HOME = saved;

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
