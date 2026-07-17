/**
 * hbridge Home Local Mode (HBRIDGE_HOME) + deterministic port/key
 *
 * When HBRIDGE_HOME=1, the bridge runs in local-only mode:
 *   - No authentication
 *   - Port derived deterministically from the working directory
 *     (9200 + MD5(cwd)[0:2] % 600 → range [9200, 9799])
 *   - Key: random base52, stored in ~/.hbridge_key (machine-global)
 *   - Auto-starts without --enable flag
 *
 * Port is derived deterministically from cwd. Key is random and
 * machine-global (same key for all directories).
 */

import { createHash, randomBytes } from "crypto";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";

const BASE52 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const KEY_FILE = join(homedir(), ".hbridge_key");

/** True when HBRIDGE_HOME env var is exactly "1". */
export function isHome() {
  return process.env.HBRIDGE_HOME == 1;
}

/**
 * Deterministic port for a given working directory.
 * Hash is stable across runs and machines for the same path.
 * Port range: 9200-9799 (600 slots, plenty for concurrent projects).
 */
export function homePort(cwd) {
  const hash = createHash("md5").update(Buffer.from(cwd, "utf-8")).digest();
  return 9200 + (hash.readUInt16BE(0) % 600);
}

/**
 * Key for this machine.
 *
 * Returns the random base52 key from ~/.hbridge_key. If the file
 * doesn't exist, generates a new random key and saves it.
 * Same key for all directories on one machine.
 *
 * @param {string} [_cwd] — accepted for backward compatibility, ignored.
 */
export function homeKey(_cwd) {
  // Read first — if file exists with a valid key, return it
  if (existsSync(KEY_FILE)) {
    const existing = readFileSync(KEY_FILE, "utf8").trim();
    if (existing && existing.startsWith("hb_")) {
      return existing;
    }
  }
  // Generate a new key if file missing, empty, or contains garbage
  const bytes = randomBytes(8);
  let key = "hb_";
  for (const byte of bytes) {
    key += BASE52[byte % 52];
  }
  writeFileSync(KEY_FILE, key, "utf8");
  return key;
}
