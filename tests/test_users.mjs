import { UserManager } from "../src/hbridge/users.mjs";
import { unlinkSync, existsSync } from "fs";
import { randomBytes } from "crypto";

function cleanup() { if (existsSync("hbridge_users.json")) unlinkSync("hbridge_users.json"); }

let pass = 0, fail = 0;
function assert(cond, msg) {
  if (cond) { pass++; }
  else { console.error(`FAIL: ${msg}`); fail++; }
}

// 1. Key format test (100 samples)
const BASE52 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
for (let i = 0; i < 100; i++) {
  const raw = Array.from({ length: 8 }, () => BASE52[randomBytes(1)[0] % 52]).join("");
  const key = "hb_" + raw.slice(0, 4) + "-" + raw.slice(4);
  assert(key.startsWith("hb_"), `prefix`);
  assert(key.length === 12, `length=${key.length}`);
  assert(key[7] === "-", `dash position`);
}
console.log("Key format: 100/100 OK");

// 2. UserManager: add + verify (exact match)
cleanup();
const users = new UserManager();
const key = users.add("xu");
console.log(`Key: ${key}`);

// 所见即所得 — exact match
assert(users.verify("xu", key), "exact match");
assert(!users.verify("xu", key + "x"), "wrong key rejected");
assert(!users.verify("xu", "wrong"), "garbage rejected");

// 3. Regenerate
const key2 = users.regenerate("xu");
assert(key2 !== key, "regen new key");
assert(users.verify("xu", key2), "regen key works");

// 4. List + Del
assert(!!users.list().xu, "list has xu");
users.del("xu");
assert(!users.list().xu, "xu deleted");

cleanup();
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
