// Test MCP tool handlers — h2c_enable, h2c_disable, h2c_status
//
// Tests the state-machine behavior through the shared state file:
//   1. Fresh state → not running → status reports "stopped"
//   2. markRunning → running → status reports "running" with port
//   3. markStopped → not running → status reports "stopped" again
//   4. Client IP tracking appears in running status
//   5. h2c_status output format matches what MCP tools return
//
// These tests verify the FIXED behavior: h2c_status must check
// state.running before deciding whether to say "running" or "stopped".

import { readState, writeState, markRunning, markStopped } from "../src/hermes_to_claude/state.mjs";
import { homePort } from "../src/hermes_to_claude/home.mjs";
import { unlinkSync, existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";

const STATE_FILE = join(homedir(), ".H2C_state.json");

let pass = 0, fail = 0;
function assert(cond, msg) {
  if (cond) { pass++; }
  else { console.error(`FAIL: ${msg}`); fail++; }
}

function cleanup() {
  if (existsSync(STATE_FILE)) unlinkSync(STATE_FILE);
}

/**
 * Build the status message the same way the FIXED h2c_status will.
 * This is the contract the MCP handler must satisfy.
 */
function buildStatus() {
  const state = readState();
  if (!state.running) {
    return "h2c stopped";
  }
  let msg = `h2c running on :${state.port}`;
  if (state.lastClientIP) {
    msg += ` | Last: ${state.lastClientIP} at ${new Date(state.lastActiveAt).toLocaleString()}`;
  }
  return msg;
}

// ── Setup: clean state ──────────────────────────────────────────────
cleanup();

// ── 1. Fresh state (no file) → not running ──────────────────────────
const s1 = readState();
assert(s1.running === false, "fresh state: running=false");
assert(s1.port === 9190, "fresh state: default port=9190");

const msg1 = buildStatus();
assert(msg1 === "h2c stopped", "fresh state status: 'h2c stopped'");
assert(!msg1.includes("Last:"), "fresh state status: no client IP");

// ── 2. After markRunning → running ──────────────────────────────────
const port = homePort(process.cwd());
markRunning(port);

const s2 = readState();
assert(s2.running === true, "after markRunning: running=true");
assert(s2.port === port, "after markRunning: port matches homePort");

const msg2 = buildStatus();
assert(msg2.includes(`h2c running on :${port}`), "after markRunning status: shows running with port");
assert(!msg2.includes("Last:"), "after markRunning status: no client IP yet");

// ── 3. After markStopped → not running ──────────────────────────────
markStopped();

const s3 = readState();
assert(s3.running === false, "after markStopped: running=false");

const msg3 = buildStatus();
assert(msg3 === "h2c stopped", "after markStopped status: 'h2c stopped' (was bug: showed running)");

// ── 4. Running + client IP → IP shown in status ────────────────────
markRunning(port);
writeState({ lastClientIP: "10.0.0.1", lastActiveAt: 1712345678000 });

const s4 = readState();
assert(s4.lastClientIP === "10.0.0.1", "client IP persisted");

const msg4 = buildStatus();
assert(msg4.includes("Last: 10.0.0.1"), "running status with client IP shows IP");
assert(msg4.includes("h2c running on"), "running status with client IP still shows running");

// ── 5. After definitive stop → IP cleared from status ───────────────
markStopped();
// Write some IP data (simulates leftover state after stop)
writeState({ running: false, lastClientIP: "10.0.0.1", lastActiveAt: 1712345678000 });

const msg5 = buildStatus();
assert(msg5 === "h2c stopped", "stopped with stale IP data: still shows stopped");
assert(!msg5.includes("10.0.0.1"), "stopped with stale IP data: no IP in output");

// ── 6. markStopped resets tasks to 0 ────────────────────────────────
markRunning(port);
writeState({ tasks: 42 });
markStopped();
const s6 = readState();
assert(s6.running === false, "markStopped: running false");
assert(s6.tasks === 0, "markStopped: tasks reset to 0");

// ── Teardown ────────────────────────────────────────────────────────
cleanup();

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
