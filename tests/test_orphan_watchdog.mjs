// Unit tests for the orphan-process watchdog (src/hermes_to_claude/orphan_watchdog.mjs)
// Run via: node tests/test_orphan_watchdog.mjs

import {
  startOrphanWatchdog,
  findLauncherPid,
  isClaudeProcess,
} from "../src/hermes_to_claude/orphan_watchdog.mjs";

let pass = 0, fail = 0;
function assert(cond, msg) {
  if (cond) { pass++; }
  else { console.error(`FAIL: ${msg}`); fail++; }
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Fake process table: h2c(1000) → cmd.exe(2000) → claude.exe(3000) → wininit(4000)
function makeMap() {
  return new Map([
    [1000, { ppid: 2000, name: "node.exe",  cmdline: "node h2c.mjs" }],
    [2000, { ppid: 3000, name: "cmd.exe",   cmdline: "cmd.exe /c h2c enable" }],
    [3000, { ppid: 4000, name: "claude.exe", cmdline: "C:\\claude\\claude.exe" }],
    [4000, { ppid: 0,    name: "wininit.exe", cmdline: "" }],
  ]);
}

async function main() {
  console.log("=== Orphan watchdog tests ===");

  // ── H2C_NO_AUTO_EXIT=1 disables the watchdog ──
  process.env.H2C_NO_AUTO_EXIT = "1";
  const disabled = startOrphanWatchdog({ onExit: () => {} });
  assert(disabled === null, "H2C_NO_AUTO_EXIT=1 disables watchdog");
  delete process.env.H2C_NO_AUTO_EXIT;

  // ── findLauncherPid walks UP through intermediate shells ──
  const map = makeMap();
  assert(findLauncherPid(1000, map) === 3000,
    "findLauncherPid walks up through cmd.exe to claude.exe");
  assert(findLauncherPid(3000, map) === 3000,
    "findLauncherPid finds claude when it IS the start pid");
  assert(findLauncherPid(1000, new Map([[1000, { ppid: 0, name: "node.exe", cmdline: "" }]])) === null,
    "findLauncherPid returns null when no claude in the chain");
  assert(findLauncherPid(1000, map, 1) === null,
    "findLauncherPid respects maxDepth");
  assert(findLauncherPid(0, map) === null, "findLauncherPid handles pid<=0");
  assert(findLauncherPid(9999, map) === null, "findLauncherPid handles unknown start pid");

  // ── isClaudeProcess matches name or cmdline ──
  assert(isClaudeProcess({ name: "claude.exe", cmdline: "" }),
    "isClaudeProcess matches name");
  assert(isClaudeProcess({ name: "node.exe", cmdline: "node /usr/lib/claude/cli.js" }),
    "isClaudeProcess matches cmdline");
  assert(isClaudeProcess({ name: "CLAUDE", cmdline: "" }),
    "isClaudeProcess is case-insensitive");
  assert(!isClaudeProcess({ name: "node.exe", cmdline: "node h2c.mjs" }),
    "isClaudeProcess rejects non-claude");
  assert(!isClaudeProcess({ name: "/bin/zsh", cmdline: "source /Users/xu/.claude/shell-snapshots/snapshot.sh && eval 'h2c enable'" }),
    "isClaudeProcess rejects .claude data-dir path in shell cmdline");
  assert(isClaudeProcess({ name: "node", cmdline: "node /usr/lib/node_modules/@anthropic-ai/claude-code/cli.js" }),
    "isClaudeProcess matches npm claude-code package path");

  // ── no claude launcher → no-op, never exits ──
  const noClaude = new Map([[1000, { ppid: 0, name: "node.exe", cmdline: "node h2c.mjs" }]]);
  const exits0 = [];
  const wd0 = startOrphanWatchdog({ pollMs: 20, getProcessMap: () => noClaude, isAlive: () => true, startPid: 1000, onExit: r => exits0.push(r) });
  await sleep(60);
  assert(exits0.length === 0, "no claude launcher → no orphan detection, never exits");
  assert(typeof wd0.stop === "function", "no-op watchdog still exposes stop()");
  wd0.stop();

  // ── claude alive → does NOT exit ──
  const exits1 = [];
  const wd1 = startOrphanWatchdog({ pollMs: 20, getProcessMap: () => map, isAlive: () => true, startPid: 1000, onExit: r => exits1.push(r) });
  await sleep(80);
  assert(exits1.length === 0, "claude alive → watchdog does NOT exit");
  wd1.stop();

  // ── claude dies → exits with reason ──
  const exits2 = [];
  let alive2 = true;
  const wd2 = startOrphanWatchdog({ pollMs: 20, getProcessMap: () => map, isAlive: () => alive2, startPid: 1000, onExit: r => exits2.push(r) });
  await sleep(50);
  alive2 = false; // claude dies
  await sleep(60);
  assert(exits2.length === 1 && exits2[0] === "launcher-gone",
    `claude dies → exit once with reason (got ${JSON.stringify(exits2)})`);
  wd2.stop();

  // ── stop() prevents later exit ──
  const exits3 = [];
  let alive3 = true;
  const wd3 = startOrphanWatchdog({ pollMs: 20, getProcessMap: () => map, isAlive: () => alive3, startPid: 1000, onExit: r => exits3.push(r) });
  await sleep(50);
  wd3.stop();
  alive3 = false;
  await sleep(60);
  assert(exits3.length === 0, "stop() prevents later exit");
  wd3.stop(); // idempotent

  // ── getProcessMap throwing → no-op, no crash ──
  const exits4 = [];
  const wd4 = startOrphanWatchdog({ pollMs: 20, getProcessMap: () => { throw new Error("boom"); }, isAlive: () => true, startPid: 1000, onExit: r => exits4.push(r) });
  await sleep(60);
  assert(exits4.length === 0, "getProcessMap failure → no-op, no crash");
  assert(typeof wd4.stop === "function", "failure watchdog still exposes stop()");
  wd4.stop();

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail > 0 ? 1 : 0);
}

main();
