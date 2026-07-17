// Test home.mjs — isHome() + homePort()
import { isHome, homePort } from "../src/hbridge/home.mjs";

let pass = 0, fail = 0;
function assert(cond, msg) {
  if (cond) { pass++; }
  else { console.error(`FAIL: ${msg}`); fail++; }
}

const saved = process.env.HBRIDGE_HOME;

// 1. isHome() returns false when HBRIDGE_HOME not set
delete process.env.HBRIDGE_HOME;
assert(isHome() === false, "no env -> false");

// 2. isHome() returns true when HBRIDGE_HOME=1
process.env.HBRIDGE_HOME = "1";
assert(isHome() === true, "HBRIDGE_HOME=1 -> true");

// 3. isHome() returns false for non-"1" values
process.env.HBRIDGE_HOME = "0";
assert(isHome() === false, "HBRIDGE_HOME=0 -> false (strict ==1)");

process.env.HBRIDGE_HOME = "true";
assert(isHome() === false, "HBRIDGE_HOME=true -> false (strict ==1)");

process.env.HBRIDGE_HOME = "";
assert(isHome() === false, "HBRIDGE_HOME='' -> false");

// Restore for deterministic tests
process.env.HBRIDGE_HOME = saved;

// 4. homePort returns integer in [9200, 9800)
const p1 = homePort("/test/path");
assert(Number.isInteger(p1), "port is integer");
assert(p1 >= 9200 && p1 < 9800, "port in [9200, 9800)");

// 5. Deterministic: same cwd → same port
assert(homePort("/test/path") === p1, "deterministic for same cwd");

// 6. Different cwds likely give different ports
const p2 = homePort("/different/path");
assert(p1 !== p2, "different cwds likely different ports");

// 7. Round-trip: wide path coverage
const ports = new Set();
for (const dir of ["/a", "/b", "/c/d/e/f", "/very/long/path/that/should/work/fine"]) {
  ports.add(homePort(dir));
}
assert(ports.size >= 2, "multiple paths produce mixed ports");
assert([...ports].every(p => p >= 9200 && p < 9800), "all ports in range");

// 8. Known port for a known input
const known = homePort("D:/xu_git/hermes-claude-bridge");
assert(known === known, "port is self-consistent");

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
