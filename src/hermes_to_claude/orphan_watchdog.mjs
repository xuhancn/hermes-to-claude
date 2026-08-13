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
 * Detection strategy (single signal): stdin 'end'.
 *   In the common launch path (`h2c enable` run from Claude Code's Bash tool),
 *   h2c inherits a stdin pipe from the launching shell. When Claude Code
 *   exits, the Bash tool process dies, the pipe's write end closes, and h2c's
 *   stdin emits 'end' — that is the orphan signal.
 *
 *   A parent-PID poll is deliberately NOT used: under the Windows Git
 *   Bash/MSYS fork model, node's ppid can point at an intermediate sh.exe that
 *   outlives the real parent shell, so ppid checks miss real orphans. stdin
 *   close is the reliable signal.
 *
 *   An 'end' within the first `stdinGraceMs` after startup is remembered but
 *   not acted on until the window has elapsed — a launcher that closes stdin
 *   right after spawn (never handed us a pipe) is not an orphan, while a
 *   launcher that dies inside the window is still cleaned up once it passes.
 *
 * Set H2C_NO_AUTO_EXIT=1 to disable orphan detection entirely.
 */

const STDIN_GRACE_MS = 300000;

export function startStdinWatchdog({
  stdinGraceMs = STDIN_GRACE_MS,
  stdin = process.stdin,
  onExit = () => {},
} = {}) {
  if (process.env.H2C_NO_AUTO_EXIT === "1") {
    return null;
  }

  let exited = false;
  let stdinEnded = false;
  let timer = null;
  const startedAt = Date.now();

  function fire() {
    if (exited) return;
    exited = true;
    stop();
    onExit("stdin-closed");
  }

  function onEnd() {
    stdinEnded = true;
    if (exited) return;
    const remaining = stdinGraceMs - (Date.now() - startedAt);
    if (remaining <= 0) {
      // Window already elapsed — orphan, exit now.
      fire();
    } else {
      // Close within the grace window — remember it and exit once the window
      // has elapsed (a launcher that dies right after spawn is still an
      // orphan; a launcher that never gave us a pipe is not).
      timer = setTimeout(fire, remaining);
      // Don't let the watchdog alone hold the event loop open.
      if (typeof timer.unref === "function") timer.unref();
    }
  }

  function stop() {
    stdin.off("end", onEnd);
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  }

  stdin.on("end", onEnd);

  return { stop };
}
