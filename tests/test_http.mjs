import { createServer } from "../src/hbridge/server.mjs";
import { homeKey } from "../src/hbridge/home.mjs";
import { Bridge } from "../src/hbridge/bridge.mjs";
import { request } from "http";
let pass = 0, fail = 0;
function a(c, m) { if (c) pass++; else { console.error("FAIL: " + m); fail++; } }
const key = homeKey(process.cwd());
const br = new Bridge();
const s = createServer(key, br);
await new Promise(r => s.listen(9199, () => {
  request("http://127.0.0.1:9199/health", res => { a(res.statusCode === 200, "health 200"); res.resume(); request("http://127.0.0.1:9199/v1/task/output?task_id=x", res2 => { a(res2.statusCode === 401, "unauth 401"); res2.resume(); s.close(r); }).end(); }).end();
}));
console.log(pass + " passed, " + fail + " failed");
process.exit(fail > 0 ? 1 : 0);
