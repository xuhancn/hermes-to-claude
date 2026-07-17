import { createServer as http } from "http";
import { Bridge } from "./bridge.mjs";
import { incrementTasks, writeState } from "./state.mjs";
import { isHome } from "./home.mjs";

let taskCount = 0, startTime = Date.now();
let bridge = new Bridge();

export function createServer(expectedKey) {
  return http((req, res) => {
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      return res.end();
    }

    if (req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ status: "ok" }));
    }

    // Auth: skip in home mode, enforce key in remote mode
    if (!isHome()) {
      const auth = req.headers["authorization"] || "";
      const providedKey = Buffer.from(auth.split(" ")[1] || "", "base64")
        .toString().split(":")[1];

      console.error(`AUTH: key_match=${providedKey === expectedKey}`);
      if (providedKey !== expectedKey) {
        res.writeHead(401);
        return res.end("Unauthorized");
      }
    }

    // Track connection info
    const clientIP = req.socket.remoteAddress?.replace(/^::ffff:/, "") || "unknown";
    writeState({ lastClientIP: clientIP, lastActiveAt: Date.now() });

    const isPost = req.method === "POST";
    let body = "";

    async function handle() {
      try {
        let result = {};
        let status = 200;
        const payload = body ? JSON.parse(body) : {};

        const [_, v, endpoint, action] = req.url.split("/");

        if (endpoint === "task" && action === "create" && isPost) {
          taskCount++;
          incrementTasks();
          result = await (async () => bridge.createTask(payload.prompt))();
        } else if (endpoint === "task" && action === "output") {
          const taskId = new URL(`http://localhost${req.url}`).searchParams.get("task_id");
          result = bridge.getTaskOutput(taskId) || { error: "not_found" };
        } else if (endpoint === "task") {
          const taskId = new URL(`http://localhost${req.url}`).searchParams.get("task_id");
          result = bridge.getTask(taskId) || { error: "not_found" };
        } else {
          status = 404;
          result = { error: "not_found" };
        }

        res.writeHead(status, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result));
      } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: e.message }));
      }
    }

    if (isPost) {
      req.on("data", d => body += d);
      req.on("end", handle);
    } else {
      handle();
    }
  });
}

export function startStatusBar(port) {
  function render() {
    const uptime = Math.floor((Date.now() - startTime) / 60000);
    process.stdout.write(`\r  hbridge: on | port: ${port} | ${taskCount} tasks | ↑ ${uptime}min  `);
  }
  render();
  return setInterval(render, 5000);
}

export function stopStatusBar(intervalId) {
  clearInterval(intervalId);
}
