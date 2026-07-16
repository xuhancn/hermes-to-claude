// Test state.mjs — shared state management
import { readState, writeState, markRunning, markStopped, incrementTasks } from "../src/hbridge/state.mjs";
import { writeFileSync, unlinkSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";

const STATE_FILE = join(homedir(), ".hbridge_state.json");

let pass = 0, fail = 0;
function assert(cond, msg) {
  if (cond) { pass++; }
  else { console.error(`FAIL: ${msg}`); fail++; }
}

function cleanup() {
  if (existsSync(STATE_FILE)) unlinkSync(STATE_FILE);
}

cleanup();

// 1. No state file → default (not running)
const d = readState();
assert(d.running === false, "default running=false");
assert(d.port === 9190, "default port=9190");
assert(d.tasks === 0, "default tasks=0");
assert(Array.isArray(d.users), "default users is array");

// 2. markRunning
const r = markRunning(9190, ["xu"]);
assert(r.running === true, "markRunning sets running=true");
assert(r.port === 9190, "markRunning port=9190");
assert(r.users[0] === "xu", "markRunning users[0]=xu");
assert(typeof r.startedAt === "number", "markRunning startedAt is number");
assert(typeof r.updatedAt === "number", "markRunning updatedAt is number");

// 3. readState after markRunning
const r2 = readState();
assert(r2.running === true, "readState after markRunning");
assert(r2.users[0] === "xu", "readState after markRunning users");

// 4. incrementTasks
const t1 = incrementTasks();
assert(t1.tasks === 1, "incrementTasks -> 1");
const t2 = incrementTasks();
assert(t2.tasks === 2, "incrementTasks -> 2");

// 5. markStopped
const s = markStopped();
assert(s.running === false, "markStopped sets running=false");
assert(s.tasks === 0, "markStopped resets tasks=0");
assert(s.users.length === 0, "markStopped resets users");
assert(s.port === 9190, "markStopped port=9190");

// 6. Partial writeState preserves other fields
writeState({ running: true, port: 9190, users: ["xu"], tasks: 3, startedAt: 100, updatedAt: 100 });
writeState({ tasks: 5 });
const p = readState();
assert(p.running === true, "partial write preserves running");
assert(p.users[0] === "xu", "partial write preserves users");
assert(p.tasks === 5, "partial write updates tasks");
assert(p.updatedAt !== 100, "partial write updates updatedAt");

// 7. Corrupted state file → default
writeState({ running: true });
writeFileSync(STATE_FILE, "{broken json");
const d2 = readState();
assert(d2.running === false, "corrupted state -> default running=false");

cleanup();
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
