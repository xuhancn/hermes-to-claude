// Unit tests for the orphan-process watchdog (src/hermes_to_claude/orphan_watchdog.mjs)
// Run via: node tests/test_orphan_watchdog.mjs

import { EventEmitter } from "events";
import { startStdinWatchdog } from "../src/hermes_to_claude/orphan_watchdog.mjs";

let pass = 0, fail = 0;
function assert(cond, msg) {
  if (cond) { pass++; }
  else { console.error(`FAIL: ${msg}`); fail++; }
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  console.log("=== Orphan watchdog tests ===");

  // ── H2C_NO_AUTO_EXIT=1 disables the watchdog ──
  process.env.H2C_NO_AUTO_EXIT = "1";
  const disabled = startStdinWatchdog({ onExit: () => {} });
  assert(disabled === null, "H2C_NO_AUTO_EXIT=1 disables watchdog");
  delete process.env.H2C_NO_AUTO_EXIT;

  // ── stdin 'end' within the grace window does NOT exit immediately ──
  const mockStdin = new EventEmitter();
  const reasons = [];
  const wd1 = startStdinWatchdog({ stdinGraceMs: 1000, stdin: mockStdin, onExit: (r) => reasons.push(r) });
  mockStdin.emit("end"); // stdin closed right after launch — not yet an orphan
  await sleep(100);
  assert(reasons.length === 0, "stdin end within grace does not exit immediately");
  wd1.stop();

  // ── ...but the same close exits once the grace window has elapsed ──
  const mockStdin2 = new EventEmitter();
  const reasons2 = [];
  const wd2 = startStdinWatchdog({ stdinGraceMs: 50, stdin: mockStdin2, onExit: (r) => reasons2.push(r) });
  mockStdin2.emit("end"); // within the 50ms window
  await sleep(150);        // window elapses -> deferred exit fires
  assert(reasons2.length === 1 && reasons2[0] === "stdin-closed",
    `stdin end within grace exits after grace elapses (got ${JSON.stringify(reasons2)})`);
  wd2.stop();

  // ── stdin 'end' after the grace window triggers exit immediately ──
  const mockStdin3 = new EventEmitter();
  const reasons3 = [];
  const wd3 = startStdinWatchdog({ stdinGraceMs: 50, stdin: mockStdin3, onExit: (r) => reasons3.push(r) });
  await sleep(120);        // pass the 50ms grace window
  mockStdin3.emit("end");
  await sleep(50);
  assert(reasons3.length === 1 && reasons3[0] === "stdin-closed",
    `stdin end after grace triggers exit (got ${JSON.stringify(reasons3)})`);
  wd3.stop();

  // ── stop() prevents a later 'end' from firing ──
  const mockStdin4 = new EventEmitter();
  const reasons4 = [];
  const wd4 = startStdinWatchdog({ stdinGraceMs: 50, stdin: mockStdin4, onExit: (r) => reasons4.push(r) });
  await sleep(120);
  wd4.stop();
  mockStdin4.emit("end");
  await sleep(50);
  assert(reasons4.length === 0, "stop() prevents later exit");
  wd4.stop(); // idempotent

  // ── watchdog exposes stop() ──
  const wd5 = startStdinWatchdog({ onExit: () => {} });
  assert(typeof wd5.stop === "function", "watchdog exposes stop()");
  wd5.stop();

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail > 0 ? 1 : 0);
}

main();
