// Test statusline.mjs — output format in different states
// Spawns dist/statusline.mjs with controlled state + inbox files
import { spawnSync } from "child_process";
import { writeFileSync, unlinkSync, existsSync, readFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";

const STATE_FILE = join(homedir(), ".hbridge_state.json");
const INBOX_FILE = join(homedir(), ".hbridge_inbox.json");

let pass = 0, fail = 0;
function assert(cond, msg) {
  if (cond) { pass++; }
  else { console.error(`FAIL: ${msg}`); fail++; }
}

function setState(obj) { writeFileSync(STATE_FILE, JSON.stringify(obj)); }
function setInbox(arr) { writeFileSync(INBOX_FILE, JSON.stringify(arr)); }
function cleanup() {
  if (existsSync(STATE_FILE)) unlinkSync(STATE_FILE);
  if (existsSync(INBOX_FILE)) unlinkSync(INBOX_FILE);
}

function run() {
  const r = spawnSync("node", ["dist/statusline.mjs"], { encoding: "utf8" });
  return r.stdout.trim();
}

// 1. No state file → "hbridge: off"
cleanup();
assert(run() === "hbridge: off", "no state -> off");

// 2. State says off → "hbridge: off"
setState({ running: false, port: 9190 });
assert(run() === "hbridge: off", "state off -> off");

// 3. Stale state (running but no server) → "hbridge: off" + state reset
setState({ running: true, port: 9199 });
const out3 = run();
assert(out3 === "hbridge: off", "stale state -> off (got: '" + out3 + "')");
const s3 = JSON.parse(readFileSync(STATE_FILE, "utf8"));
assert(s3.running === false, "stale state -> resets running=false");

// 4. Corrupted inbox → no crash, still shows off (liveness fails on port 9199)
setState({ running: true, port: 9199 });
setInbox([{ status: "pending", prompt: "fix" }]);
writeFileSync(INBOX_FILE, "{broken");
const out4 = run();
assert(out4 === "hbridge: off", "corrupted inbox -> off");

// 5. Full integration: state + real inbox (non-stale)
// Reset state to running:false first
cleanup();
setState({ running: false });

cleanup();
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
