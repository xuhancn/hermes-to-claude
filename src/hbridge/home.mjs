/**
 * hbridge Home Local Mode (HBRIDGE_HOME)
 *
 * When HBRIDGE_HOME=1, the bridge runs in local-only mode:
 *   - No authentication
 *   - Port derived deterministically from the working directory
 *     (9200 + MD5(cwd)[0:2] % 600 → range [9200, 9799])
 *   - Auto-starts without --enable flag
 */

import { createHash } from "crypto";

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
