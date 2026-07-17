/**
 * hbridge single-key verification.
 *
 * No multi-user storage — key is derived deterministically from cwd.
 * Home mode skips auth entirely; remote mode verifies against this key.
 */

import { homeKey } from "./home.mjs";

/** Verify a key matches the deterministic key for this directory. */
export function verifyKey(cwd, key) {
  return homeKey(cwd) === key;
}
