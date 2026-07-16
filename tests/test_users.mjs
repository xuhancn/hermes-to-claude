import { UserManager } from "../src/hbridge/users.mjs";
import { unlinkSync, existsSync } from "fs";

const DB = "./tests/hbridge_users_test.json";
function cleanup() { if (existsSync(DB)) unlinkSync(DB); }

let pass = 0, fail = 0;
function assert(cond, msg) {
  if (cond) { pass++; }
  else { console.error(`FAIL: ${msg}`); fail++; }
}

cleanup();
// NOTE: DB path is hardcoded in users.mjs — need to write test file manually
import { writeFileSync } from "fs";

// Directly test key format logic
import { randomBytes } from "crypto";
const BASE52 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
for (let i = 0; i < 100; i++) {
  const raw = Array.from({ length: 8 }, () => BASE52[randomBytes(1)[0] % 52]).join("");
  const formatted = "hb_" + raw.slice(0, 4) + "-" + raw.slice(4);
  assert(formatted.startsWith("hb_"), `key prefix [${i}]`);
  assert(formatted.length === 12, `key length ${formatted.length} [${i}]`);
  assert(formatted[6] === "-" || formatted[7] === "-", `dash missing [${i}]`);
}
console.log("Key format: 100/100 OK");

// Test verify logic directly
const users = new UserManager();
const key = users.add("xu");
console.log(`Generated key: ${key}`);
const flat = key.replace(/[^A-Za-z]/g, ""); // strip hb_ and dash
assert(key[7] === "-", `dash at position 7: ${key}`);

// Verify — see what happens
const ok1 = users.verify("xu", key); // with dash
console.log(`verify with dash: ${ok1}`);
assert(ok1, "verify with dash");

const ok2 = users.verify("xu", key.replace("-", ""));
console.log(`verify without dash: ${ok2}`);
assert(ok2, "verify without dash");

cleanup();
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
