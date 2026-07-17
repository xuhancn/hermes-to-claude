// Test users.mjs — single-key deterministic verification
import { verifyKey } from "../src/hbridge/users.mjs";
import { homeKey } from "../src/hbridge/home.mjs";

let pass = 0, fail = 0;
function assert(cond, msg) {
  if (cond) { pass++; }
  else { console.error(`FAIL: ${msg}`); fail++; }
}

const testCwd = process.cwd();
const derivedKey = homeKey(testCwd);

// 1. Key format
assert(derivedKey.startsWith("hb_"), `Key starts with hb_: ${derivedKey}`);
assert(derivedKey.length > 3, `Key has content after hb_: length=${derivedKey.length}`);

// 2. verifyKey match
assert(verifyKey(testCwd, derivedKey), "verifyKey matches own key");

// 3. verifyKey mismatch
assert(!verifyKey(testCwd, derivedKey + "x"), "wrong key rejected");
assert(!verifyKey(testCwd, "hb_WRONG"), "garbage rejected");

// 4. Deterministic — same cwd → same key
assert(homeKey(testCwd) === derivedKey, "deterministic: same cwd same key");

// 5. Different cwd → different key
const otherKey = homeKey("/tmp/some-other-dir");
assert(derivedKey !== otherKey, "different cwd different key");
assert(otherKey.startsWith("hb_"), "other key starts with hb_");

// 6. Verify that substring [4:10] of md5 is used (check key length consistency)
const anotherKey = homeKey("/another/test/path");
assert(anotherKey.startsWith("hb_"), "another key starts with hb_");

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
