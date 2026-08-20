/**
 * Orphan-process watchdog — h2c auto-exit when the launching Claude Code exits.
 *
 * h2c is started from inside Claude Code via `h2c enable` (the /h2c skill runs
 * it in a shell attached to Claude Code). That server process outlives its
 * parent shell, so when Claude Code exits the shell dies and h2c is left
 * running as an orphan holding the port.
 *
 * This module detects the orphan state and invokes `onExit` so the caller can
 * release the port and shut down cleanly.
 *
 * Detection strategy: walk UP the process tree to find the Claude Code process
 * that launched us, then poll its liveness.
 *
 *   We deliberately do NOT use stdin 'end' as the orphan signal. On Windows,
 *   Claude Code's Bash tool spawns commands with a stdin pipe that closes ~4ms
 *   after spawn (NOT when Claude Code exits), so stdin 'end' fires while
 *   Claude Code is still alive — a false orphan signal that made h2c exit
 *   ~360s into a healthy session (see references/windows-orphan-debug.md for
 *   the probe reproduction).
 *
 *   We also do NOT use a naive parent-PID check: under the Windows Git
 *   Bash/MSYS fork model, node's ppid can point at an intermediate sh.exe that
 *   outlives the real parent, so a single ppid check misses real orphans.
 *   Instead we walk the full parent chain until we hit a process whose name or
 *   command line contains "claude" (the Claude Code process), or run out of
 *   depth. If we never find one, h2c was launched from outside Claude Code
 *   (e.g. a manual terminal) and no orphan detection is needed.
 *
 * Set H2C_NO_AUTO_EXIT=1 to disable orphan detection entirely.
 */

import { logEvent } from "./log.mjs";
import { execFileSync } from "child_process";

const DEFAULT_POLL_MS = 10000;
const DEFAULT_MAX_DEPTH = 20;

export function isClaudeProcess({ name = "", cmdline = "" }) {
  const n = (name || "").toLowerCase();
  const c = (cmdline || "").toLowerCase();
  // Process executable is literally named claude* (native install).
  if (n.includes("claude")) return true;
  // Claude appears in the command line as an executable/package path (npm
  // install runs `node .../claude-code/cli.js`). Exclude ".claude" — that's
  // Claude Code's *data directory* (~/.claude/...), which the Bash tool's
  // intermediate shell (zsh/bash) carries in its own cmdline while running
  // `h2c enable`. Matching it would misidentify that shell as the launcher.
  return c.includes("claude") && !c.includes(".claude");
}

// Snapshot every process into a Map<pid, { ppid, name, cmdline }>.
function defaultGetProcessMap() {
  const map = new Map();
  if (process.platform === "win32") {
    const script =
      'Get-CimInstance Win32_Process | ForEach-Object { "$($_.ProcessId)|$($_.ParentProcessId)|$($_.Name)|$($_.CommandLine)" }';
    const out = execFileSync(
      "powershell",
      ["-NoProfile", "-NonInteractive", "-Command", script],
      { encoding: "utf8", timeout: 10000, maxBuffer: 16 * 1024 * 1024, windowsHide: true }
    );
    for (const line of out.split("\n")) {
      const [pidStr, ppidStr, name, ...cmdRest] = line.split("|");
      const pid = parseInt(pidStr, 10);
      const ppid = parseInt(ppidStr, 10);
      if (!Number.isInteger(pid) || !Number.isInteger(ppid)) continue;
      map.set(pid, { ppid, name: name || "", cmdline: cmdRest.join("|") || "" });
    }
  } else {
    const out = execFileSync("ps", ["-eo", "pid=,ppid=,comm=,args="], {
      encoding: "utf8",
      timeout: 10000,
      maxBuffer: 16 * 1024 * 1024,
    });
    for (const line of out.split("\n")) {
      const m = line.match(/^\s*(\d+)\s+(\d+)\s+(\S+)\s*(.*)$/);
      if (!m) continue;
      const pid = parseInt(m[1], 10);
      const ppid = parseInt(m[2], 10);
      map.set(pid, { ppid, name: m[3], cmdline: m[4] || "" });
    }
  }
  return map;
}

function defaultIsAlive(pid) {
  try {
    process.kill(pid, 0);
    return true; // process exists
  } catch (err) {
    // EPERM: alive but no permission to signal. ESRCH (or anything else): gone.
    return err && err.code === "EPERM";
  }
}

/**
 * Walk the parent chain from `startPid` upward, returning the first PID whose
 * name/cmdline looks like Claude Code, or null if none is found within
 * `maxDepth` hops (or the chain reaches the root).
 */
export function findLauncherPid(startPid, map, maxDepth = DEFAULT_MAX_DEPTH) {
  let pid = startPid;
  for (let depth = 0; depth < maxDepth; depth++) {
    if (!pid || pid <= 0) return null;
    const info = map.get(pid);
    if (!info) return null;
    if (isClaudeProcess(info)) return pid;
    const ppid = info.ppid;
    if (!ppid || ppid <= 0 || ppid === pid) return null; // reached the root
    pid = ppid;
  }
  return null;
}

export function startOrphanWatchdog({
  pollMs = DEFAULT_POLL_MS,
  maxDepth = DEFAULT_MAX_DEPTH,
  onExit = () => {},
  getProcessMap = defaultGetProcessMap,
  isAlive = defaultIsAlive,
  startPid = process.ppid,
} = {}) {
  if (process.env.H2C_NO_AUTO_EXIT === "1") {
    return null;
  }

  const probe = process.env.H2C_ORPHAN_PROBE === "1";
  const startedAt = Date.now();

  let map;
  try {
    map = getProcessMap();
  } catch (err) {
    if (probe) console.error(`[orphan-probe] getProcessMap failed: ${err.message}`);
    // Can't snapshot processes — fall back to no orphan detection rather than
    // risking a false exit. Manual launch (terminal) needs none anyway.
    return { stop() {} };
  }

  const launcherPid = findLauncherPid(startPid, map, maxDepth);
  if (probe) console.error(`[orphan-probe] startPid=${startPid} launcherPid=${launcherPid}`);

  if (launcherPid == null) {
    // Not launched from Claude Code — nothing to watch.
    return { stop() {} };
  }

  let exited = false;
  let timer = null;

  function fire() {
    if (exited) return;
    exited = true;
    stop();
    logEvent("orphan_exit", { reason: "launcher-gone", uptimeMs: Date.now() - startedAt });
    onExit("launcher-gone");
  }

  function check() {
    if (exited) return;
    let alive;
    try {
      alive = isAlive(launcherPid);
    } catch (err) {
      // Transient probe error — don't kill ourselves over a hiccup.
      if (probe) console.error(`[orphan-probe] isAlive(${launcherPid}) threw: ${err.message}`);
      return;
    }
    if (probe) console.error(`[orphan-probe] poll launcherPid=${launcherPid} alive=${alive}`);
    if (!alive) fire();
  }

  function stop() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  timer = setInterval(check, pollMs);
  if (typeof timer.unref === "function") timer.unref();

  return { stop };
}
