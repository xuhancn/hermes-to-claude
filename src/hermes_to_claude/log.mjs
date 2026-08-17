/**
 * Structured event log — ~/.h2c/h2c.log (JSONL, one event per line)
 *
 * Records lifecycle events with timestamps so connection/disconnect
 * timelines can be reconstructed after the fact — e.g. diagnosing why
 * a bridge shut down unexpectedly (startup → who connected → stdin
 * closed → orphan exit).
 *
 * Events:
 *   startup         bridge started (cwd, port, version, pid)
 *   client_connect  a new client IP connected
 *   stdin_end       the launching Claude Code's stdin pipe closed
 *   orphan_exit     the orphan watchdog fired (bridge shutting down)
 *
 * Logging is best-effort: a failed write never crashes the bridge.
 */
import { appendFileSync } from "fs";
import { join } from "path";
import { H2C_DIR, ensureH2cDir } from "./paths.mjs";

const LOG_FILE = join(H2C_DIR, "h2c.log");

/**
 * Append one event to the log. Each line is JSON: { ts, event, ...fields }.
 * @param {string} event — event name (startup/client_connect/stdin_end/orphan_exit)
 * @param {object} [fields] — extra fields to record with the event
 */
export function logEvent(event, fields = {}) {
  try {
    ensureH2cDir();
    appendFileSync(LOG_FILE, JSON.stringify({ ts: Date.now(), event, ...fields }) + "\n", "utf8");
  } catch {
    // best-effort — never crash the bridge over a log write
  }
}

/** Path to the log file (for tests). */
export function getLogFilePath() {
  return LOG_FILE;
}
