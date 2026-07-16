import { createServer } from "../src/hbridge/server.mjs";
import { UserManager } from "../src/hbridge/users.mjs";
import { request } from "http";

let pass = 0, fail = 0;
function assert(cond, msg) {
  if (cond) { pass++; }
  else { console.error(`FAIL: ${msg}`); fail++; }
}

// Clean
import { rmSync, unlinkSync, existsSync } from "fs";
rmSync("hbridge_tasks", { recursive: true, force: true });
if (existsSync("hbridge_users.json")) unlinkSync("hbridge_users.json");

const users = new UserManager();
const key = users.add("xu");
const server = createServer(users);

await new Promise((resolve) => {
  server.listen(9199, () => {
    // Health
    const req1 = request("http://127.0.0.1:9199/health", (res) => {
      assert(res.statusCode === 200, "health 200");
      
      // Unauthorized
      const req2 = request("http://127.0.0.1:9199/v1/task/output?task_id=x", (res2) => {
        assert(res2.statusCode === 401, "unauth 401");

        // Task create with auth
        const auth = Buffer.from(`xu:${key}`).toString("base64");
        const opts = {
          hostname: "127.0.0.1", port: 9199,
          path: "/v1/task/create",
          method: "POST",
          headers: {
            "Authorization": `Basic ${auth}`,
            "Content-Type": "application/json",
          },
        };
        const req3 = request(opts, (res3) => {
          let data = "";
          res3.on("data", (d) => data += d);
          res3.on("end", () => {
            const r = JSON.parse(data);
            assert(!!r.task_id, "task created via HTTP");
            assert(r.status === "created", "status created");
            server.close(resolve);
          });
        });
        req3.write(JSON.stringify({ prompt: "test" }));
        req3.end();
      });
      req2.end();
    });
    req1.end();
  });
});

rmSync("hbridge_tasks", { recursive: true, force: true });
if (existsSync("hbridge_users.json")) unlinkSync("hbridge_users.json");
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
