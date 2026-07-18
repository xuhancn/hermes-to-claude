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

  // Home mode: auto-start HTTP server directly (--stdio not needed)
  if (home) return "enable(auto)";
  if (cmd === "--enable") return `enable(${sub})`;
  if (cmd === "--disable") return "disable";
  if (cmd === "--status") return "status";
  if (cmd === "--help" || cmd === "-h") return "help";
  if (cmd === "--user") return `user(${sub}, ${val})`;
  return "unknown";
}

const saved = process.env.HBRIDGE_HOME;

// ── Home mode auto-starts (no manual cmd needed) ──────────────────
process.env.HBRIDGE_HOME = "1";
assert(cli(["--enable"]) === "enable(auto)",
  "HBRIDGE_HOME=1 --enable -> enable(auto)");
assert(cli(["--stdio"]) === "enable(auto)",
  "HBRIDGE_HOME=1 --stdio -> enable(auto)");

// ── Home mode auto-starts even with any cmd ───────────────────────
assert(cli(["--disable"]) === "enable(auto)",
  "HBRIDGE_HOME=1 --disable -> enable(auto)");

// ── Home mode auto-starts with no args ────────────────────────────
assert(cli([]) === "enable(auto)",
  "HBRIDGE_HOME=1 no args -> enable(auto)");

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
