// Test log.mjs — structured event log (JSONL) at ~/.h2c/h2c.log
import { readFileSync, unlinkSync, existsSync } from "fs";
import { logEvent, getLogFilePath } from "../src/hermes_to_claude/log.mjs";

const LOG_FILE = getLogFilePath();
let pass = 0, fail = 0;
function assert(cond, msg) {
  if (cond) { pass++; }
  else { console.error(`FAIL: ${msg}`); fail++; }
}

// Clean slate
if (existsSync(LOG_FILE)) unlinkSync(LOG_FILE);

// ── 1. log file path is under ~/.h2c/ ──
assert(LOG_FILE.includes(".h2c") && LOG_FILE.endsWith("h2c.log"),
  `log path under ~/.h2c/h2c.log (got ${LOG_FILE})`);

// ── 2. logEvent writes one JSON line per event ──
logEvent("startup", { port: 9546, pid: 123 });
logEvent("client_connect", { ip: "192.168.1.42" });

const lines = readFileSync(LOG_FILE, "utf8").split("\n").filter(Boolean);
assert(lines.length === 2, `2 events written (got ${lines.length})`);

// ── 3. each line is valid JSON with ts + event ──
const first = JSON.parse(lines[0]);
assert(typeof first.ts === "number", "ts is a number");
assert(first.event === "startup", "first event is startup");
assert(first.port === 9546 && first.pid === 123, "startup fields preserved");

const second = JSON.parse(lines[1]);
assert(second.event === "client_connect", "second event is client_connect");
assert(second.ip === "192.168.1.42", "client_connect ip preserved");

// ── 4. append semantics: more events append, not overwrite ──
logEvent("stdin_end", { uptimeMs: 5000 });
logEvent("orphan_exit", { reason: "stdin-closed", uptimeMs: 5000 });
const lines2 = readFileSync(LOG_FILE, "utf8").split("\n").filter(Boolean);
assert(lines2.length === 4, `append preserves prior events (got ${lines2.length})`);

// ── 5. logEvent never throws on missing fields ──
logEvent("orphan_exit");  // no fields
const lines3 = readFileSync(LOG_FILE, "utf8").split("\n").filter(Boolean);
const last = JSON.parse(lines3[lines3.length - 1]);
assert(last.event === "orphan_exit" && last.ts !== undefined, "event without fields still logs ts+event");

// Cleanup
if (existsSync(LOG_FILE)) unlinkSync(LOG_FILE);

console.log(`\nlog: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
