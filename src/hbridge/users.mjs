/**
 * hbridge single-key verification.
 *
 * Key is random base52, stored in ~/.hbridge_key.
 * Same key for all directories on one machine.
 * Home mode skips auth entirely; remote mode verifies against this key.
 */

import { homeKey } from "./home.mjs";

/** Verify a key matches the machine-global key (cwd ignored). */
export function verifyKey(cwd, key) {
  return homeKey(cwd) === key;
}
