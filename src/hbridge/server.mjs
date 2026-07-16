import { createServer as http } from "http";

let taskCount = 0;
let startTime = Date.now();

export function createServer(users) {
  return http((req, res) => {
    if (req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok" }));
      return;
    }

    // Auth check
    const auth = req.headers["authorization"] || "";
    const [username, key] = Buffer.from(auth.split(" ")[1] || "", "base64")
      .toString().split(":");
    
    if (!users.verify(username, key)) {
      res.writeHead(401);
      res.end("Unauthorized");
      return;
    }

    if (req.url === "/v1/task/create" && req.method === "POST") {
      taskCount++;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ task_id: `task_${taskCount}` }));
    } else if (req.url === "/v1/task/status" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "done" }));
    } else {
      res.writeHead(404);
      res.end("Not found");
    }
  });
}

export function startStatusBar(port) {
  function render() {
    const uptime = Math.floor((Date.now() - startTime) / 60000);
    process.stdout.write(`\r  hbridge: on | port: ${port} | ${taskCount} tasks | ↑ ${uptime}min  `);
  }

  render();
  setInterval(render, 5000);
}
