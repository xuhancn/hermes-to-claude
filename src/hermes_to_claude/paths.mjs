/**
 * Unified h2c config directory — ~/.h2c/
 *
 * h2c previously scattered its files across the home directory:
 *   ~/.h2c_key, ~/.h2c_tasks.jsonl, ~/.h2c_state.json,
 *   ~/.h2c_user_statusline_cmd, ~/.h2c_user_statusline.json,
 *   ~/.h2c_transcript.jsonl
 *
 * This module centralizes them under ~/.h2c/ and migrates the legacy
 * root-level files on first use so existing installs keep their key,
 * task history, and state across the upgrade.
 */
import { homedir } from "os";
import { join } from "path";
import { existsSync, mkdirSync, copyFileSync } from "fs";

/** h2c config directory: ~/.h2c/ */
export const H2C_DIR = join(homedir(), ".h2c");

/** Create ~/.h2c/ if missing. Never throws. Returns the dir path. */
export function ensureH2cDir() {
  if (!existsSync(H2C_DIR)) {
    try {
      mkdirSync(H2C_DIR, { recursive: true });
    } catch {
      // best-effort — callers that need the dir handle a missing dir gracefully
    }
  }
  return H2C_DIR;
}

/**
 * Resolve a config file path under ~/.h2c/, migrating the legacy
 * root-level file (~/.h2c_xxx) into the directory on first use.
 *
 * One-way, one-time copy: runs only when the legacy file exists AND the
 * new path does not. The legacy file is left in place (never deleted),
 * so a downgrade still sees the old data.
 *
 * @param {string} oldName — legacy file name in the home dir (e.g. ".h2c_key")
 * @param {string} newName — file name inside ~/.h2c/ (e.g. "key")
 * @returns {string} the new path inside ~/.h2c/
 */
export function h2cFile(oldName, newName) {
  ensureH2cDir();
  const oldPath = join(homedir(), oldName);
  const newPath = join(H2C_DIR, newName);
  if (existsSync(oldPath) && !existsSync(newPath)) {
    try {
      copyFileSync(oldPath, newPath);
    } catch {
      // leave the legacy file in place; caller may regenerate next run
    }
  }
  return newPath;
}
