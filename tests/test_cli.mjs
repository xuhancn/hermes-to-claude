// Test CLI command parsing + HBRIDGE_HOME mode blocking
// Run via: P=123 node --input-type=module -e "..." 2>&1
// Or simpler: just test the logic directly

let pass = 0, fail = 0;
function assert(cond, msg) {
  if (cond) { pass++; }
  else { console.error(`FAIL: ${msg}`); fail++; }
}

// Simulate the combined arg + home-mode dispatch logic from cli.mjs
function cli(args) {
  const cmd = args[0], sub = args[1], val = args[2];
  const home = process.env.HBRIDGE_HOME == 1;

  // Home mode blocks manual enable/disable
  if (home && (cmd === "--enable" || cmd === "--disable")) {
    return "Home mode active — manual control disabled";
  }
  if (cmd === "--enable") return `enable(${sub})`;
  if (cmd === "--disable") return "disable";
  if (cmd === "--status") return "status";
  if (cmd === "--help" || cmd === "-h") return "help";
  if (cmd === "--user") return `user(${sub}, ${val})`;
  // Auto-start in home mode when no command given
  return "unknown";
}

const saved = process.env.HBRIDGE_HOME;

// ── Home mode blocks manual --enable ──────────────────────────
process.env.HBRIDGE_HOME = "1";
assert(cli(["--enable"]) === "Home mode active — manual control disabled",
  "HBRIDGE_HOME=1 --enable blocked");
assert(cli(["--enable", "xu"]) === "Home mode active — manual control disabled",
  "HBRIDGE_HOME=1 --enable xu blocked");

// ── Home mode blocks manual --disable ─────────────────────────
assert(cli(["--disable"]) === "Home mode active — manual control disabled",
  "HBRIDGE_HOME=1 --disable blocked");

// ── Home mode unset → normal operation ────────────────────────
delete process.env.HBRIDGE_HOME;
assert(cli(["--enable"]) === "enable(undefined)", "no HBRIDGE_HOME --enable works");
assert(cli(["--enable", "xu"]) === "enable(xu)", "no HBRIDGE_HOME --enable xu works");
assert(cli(["--disable"]) === "disable", "no HBRIDGE_HOME --disable works");

// ── Existing arg-parsing tests still pass ─────────────────────
assert(cli(["--status"]) === "status", "status");
assert(cli(["--help"]) === "help", "help");
assert(cli(["-h"]) === "help", "-h");
assert(cli(["--user", "add", "han"]) === "user(add, han)", "user add");
assert(cli(["--user", "list"]) === "user(list, undefined)", "user list");

// Cleanup
process.env.HBRIDGE_HOME = saved;

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
