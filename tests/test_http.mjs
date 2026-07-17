// Test HTTP server structure — health + auth
import { createServer } from "../src/hbridge/server.mjs";
import { homeKey } from "../src/hbridge/home.mjs";
import { request } from "http";

let pass = 0, fail = 0;
function assert(cond, msg) {
  if (cond) { pass++; }
  else { console.error(`FAIL: ${msg}`); fail++; }
}

const key = homeKey(process.cwd());
const server = createServer(key);

await new Promise((resolve) => {
  server.listen(9199, () => {
    // 1. Health
    request("http://127.0.0.1:9199/health", (res) => {
      assert(res.statusCode === 200, "health 200");
      res.resume();

      // 2. Unauthorized (no auth header)
      request("http://127.0.0.1:9199/v1/task/output?task_id=x", (res2) => {
        assert(res2.statusCode === 401, "unauth 401");
        res2.resume();
        server.close(resolve);
      }).end();
    }).end();
  });
});

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
