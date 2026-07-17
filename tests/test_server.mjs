import { createServer, startStatusBar } from "../src/hbridge/server.mjs";
import { Bridge } from "../src/hbridge/bridge.mjs";
let pass = 0, fail = 0;
function a(c, m) { if (c) pass++; else { console.error("FAIL: " + m); fail++; } }
const b = new Bridge();
const s = createServer("hb_testkey", b);
a(typeof s.listen === "function", "server has listen");
a(typeof s.close === "function", "server has close");
a(typeof startStatusBar === "function", "startStatusBar exists");
console.log(pass + " passed, " + fail + " failed");
process.exit(fail > 0 ? 1 : 0);
