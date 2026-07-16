// Test CLI command parsing
// Run via: P=123 node --input-type=module -e "..." 2>&1
// Or simpler: just test the logic directly

let pass = 0, fail = 0;
function assert(cond, msg) {
  if (cond) { pass++; }
  else { console.error(`FAIL: ${msg}`); fail++; }
}

// Simulate arg parsing logic
function parse(args) {
  const cmd = args[0], sub = args[1], val = args[2];
  if (cmd === "--enable") return `enable(${sub})`;
  if (cmd === "--disable") return "disable";
  if (cmd === "--status") return "status";
  if (cmd === "--help" || cmd === "-h") return "help";
  if (cmd === "--user") return `user(${sub}, ${val})`;
  return "unknown";
}

assert(parse(["--enable"]) === "enable(undefined)", "enable no arg");
assert(parse(["--enable", "xu"]) === "enable(xu)", "enable xu");
assert(parse(["--disable"]) === "disable", "disable");
assert(parse(["--status"]) === "status", "status");
assert(parse(["--help"]) === "help", "help");
assert(parse(["-h"]) === "help", "-h");
assert(parse(["--user", "add", "han"]) === "user(add, han)", "user add");
assert(parse(["--user", "list"]) === "user(list, undefined)", "user list");

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
