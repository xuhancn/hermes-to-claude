/**
 * hbridge Home Local Mode (HBRIDGE_HOME) + deterministic port/key
 *
 * When HBRIDGE_HOME=1, the bridge runs in local-only mode:
 *   - No authentication
 *   - Port derived deterministically from the working directory
 *     (9200 + MD5(cwd)[0:2] % 600 → range [9200, 9799])
 *   - Key derived deterministically: "hb_" + base52(MD5(cwd)[4:10])
 *   - Auto-starts without --enable flag
 *
 * Remote mode uses the SAME port+key derivation — the only difference
 * is that remote mode enforces authentication via the key.
 */

import { createHash } from "crypto";

const BASE52 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

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
 * Deterministic key for a given working directory.
 * Derives "hb_" + base52(MD5(cwd)[4:10]) — stable per directory.
 * Same key for home and remote; only auth enforcement differs.
 */
export function homeKey(cwd) {
  const hash = createHash("md5").update(Buffer.from(cwd, "utf-8")).digest();
  // 6 bytes from MD5[4:10] → 48 bits → base52
  const slice = hash.subarray(4, 10);
  let value = 0n;
  for (const byte of slice) {
    value = (value << 8n) + BigInt(byte);
  }
  let result = "";
  while (value > 0n) {
    result = BASE52[Number(value % 52n)] + result;
    value /= 52n;
  }
  return "hb_" + (result || "A");
}
