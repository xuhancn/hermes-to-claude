// Test HTTP server structure — just check exports exist
import { createServer, startStatusBar } from "../src/hbridge/server.mjs";

let pass = 0, fail = 0;
function assert(cond, msg) {
  if (cond) { pass++; }
  else { console.error(`FAIL: ${msg}`); fail++; }
}

const server = createServer("hb_testkey");
assert(typeof server.listen === "function", "server has listen");
assert(typeof server.close === "function", "server has close");
assert(typeof startStatusBar === "function", "startStatusBar exists");

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
