// Test users.mjs — single random key persisted in ~/.hbridge_key
import { unlinkSync, existsSync, readFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { verifyKey } from "../src/hbridge/users.mjs";
import { homeKey } from "../src/hbridge/home.mjs";

const KEY_FILE = join(homedir(), ".hbridge_key");
// Remove any pre-existing key file so we test fresh generation
if (existsSync(KEY_FILE)) unlinkSync(KEY_FILE);

let pass = 0, fail = 0;
function assert(cond, msg) {
  if (cond) { pass++; }
  else { console.error(`FAIL: ${msg}`); fail++; }
}

const testKey = homeKey(process.cwd());

// 1. Key format
assert(testKey.startsWith("hb_"), `Key starts with hb_: ${testKey}`);
assert(testKey.length > 3, `Key has content after hb_: length=${testKey.length}`);

// 2. Key file was created
assert(existsSync(KEY_FILE), "~/.hbridge_key file created");
const fileContent = readFileSync(KEY_FILE, "utf8").trim();
assert(fileContent === testKey, "file content matches homeKey() return");

// 3. verifyKey match
assert(verifyKey(process.cwd(), testKey), "verifyKey matches own key");

// 4. verifyKey mismatch
assert(!verifyKey(process.cwd(), testKey + "x"), "wrong key rejected");
assert(!verifyKey(process.cwd(), "hb_WRONG"), "garbage rejected");

// 5. Same key for different cwd (machine-global)
const sameKey = homeKey("/tmp/some-other-dir");
assert(sameKey === testKey, "same key for different cwd — machine-global");

// 6. Idempotent: calling again returns same key from file
const againKey = homeKey("/another/test/path");
assert(againKey === testKey, "idempotent: same key from file");

// Cleanup test key file
if (existsSync(KEY_FILE)) unlinkSync(KEY_FILE);

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
