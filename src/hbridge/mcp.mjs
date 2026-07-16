import http from "http";
import { execSync } from "child_process";
import { UserManager } from "./users.mjs";
import { Bridge } from "./bridge.mjs";
import { markRunning, markStopped } from "./state.mjs";

export function startMcpServer() {
  // Global crash protection — keep MCP alive even if something slips through
  process.on("uncaughtException", (err) => {
    process.stderr.write(`[hbridge] UNCAUGHT: ${err.message}\n`);
  });
  process.on("unhandledRejection", (err) => {
    process.stderr.write(`[hbridge] UNHANDLED: ${err}\n`);
  });

  const users = new UserManager();
  const bridge = new Bridge();
  let buf = "";

  process.stdin.on("data", (chunk) => {
    buf += chunk.toString();
    while (buf.includes("\n")) {
      const i = buf.indexOf("\n");
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (!line) continue;
      try {
        handleMcp(JSON.parse(line), users, bridge);
      } catch (e) {
        respond({
          jsonrpc: "2.0",
          error: { code: -32700, message: "Parse error" },
          id: null,
        });
      }
    }
  });

  // Health-check keepalive — respond instantly without creating a full request
  process.stdin.on("data", () => {});
}

function handleMcp(msg, users, bridge) {
  const { method, params, id } = msg;
  if (method === "notifications/initialized") return;

  if (method === "initialize") {
    respond({
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: { tools: { listChanged: true } },
        serverInfo: { name: "hbridge", version: "1.0.0" },
      },
    });
  } else if (method === "tools/list") {
    respond({ jsonrpc: "2.0", id, result: { tools: TOOLS } });
  } else if (method === "tools/call") {
    try {
      const { name, arguments: args = {} } = params;
    let t = "";
    if (name === "hbridge_enable") {
      const uname = args.user || "bridge";
      const u = users.list();
      t = u[uname] ? u[uname].key : users.add(uname);
      // Start HTTP inbox server in this process (stderr → Claude UI)
      startInboxServer(users, bridge);
    } else if (name === "hbridge_disable") {
      markStopped();
      t = "disabled";
    } else if (name === "hbridge_status") {
      t = `hbridge running on :${9190} | Users: ${Object.keys(users.list()).join(", ")}`;
    } else if (name === "hbridge_user_add") {
      const ex = users.list();
      t = ex[args.name] ? ex[args.name].key : users.add(args.name);
    } else if (name === "hbridge_user_list") {
      t = JSON.stringify(users.list());
    }
    respond({
      jsonrpc: "2.0",
      id,
      result: { content: [{ type: "text", text: t }] },
    });
    } catch (e) {
      respond({
        jsonrpc: "2.0",
        id,
        error: { code: -32603, message: `hbridge error: ${e.message}` },
      });
    }
  }
}

// ─── HTTP server (same process as MCP) ──────────────────────────────────

let inboxServer = null;

function startInboxServer(users, bridge) {
  if (inboxServer && inboxServer.listening) return;

  process.stderr.write("[hbridge] HTTP inbox starting on :9190\n");

  inboxServer = http.createServer((req, res) => {
    try {
      // Health check — no auth required (used by statusline liveness)
      if (req.url === "/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "ok" }));
        return;
      }

      // Auth
      const auth = req.headers["authorization"] || "";
      const b64 = auth.split(" ")[1] || "";
      const [username, key] = Buffer.from(b64, "base64")
        .toString()
        .split(":");
      if (!users.verify(username, key)) {
        res.writeHead(401);
        res.end("Unauthorized");
        return;
      }

      const [_, v, endpoint, actionRaw] = req.url.split("/");
      const action = actionRaw ? actionRaw.split("?")[0] : "";

      if (endpoint === "task" && action === "create" && req.method === "POST") {
        let body = "";
        req.on("data", (d) => (body += d));
        req.on("end", async () => {
          try {
            const prompt = JSON.parse(body).prompt || "";
            const result = await bridge.createTask(prompt);
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify(result));
          } catch (e) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: e.message }));
          }
        });
        return;
      }

      if (endpoint === "task" && action === "output" && req.method === "GET") {
        const taskId = new URL(`http://localhost${req.url}`).searchParams.get(
          "task_id"
        );
        const result = bridge.getTaskOutput(taskId);
        if (!result) {
          res.writeHead(404);
          res.end(JSON.stringify({ error: "not_found" }));
          return;
        }
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result));
        return;
      }

      res.writeHead(404);
      res.end(JSON.stringify({ error: "not_found" }));
    } catch (e) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: e.message }));
    }
  });

  // Mark running only after successful listen (avoids race with
  // statusline liveness check during EADDRINUSE recovery)
  inboxServer.on("listening", () => {
    markRunning(9190, Object.keys(users.list()));
    process.stderr.write("[hbridge] HTTP inbox listening on :9190\n");
  });

  inboxServer.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      process.stderr.write(`[hbridge] Port 9190 in use — killing old process\n`);
      inboxServer = null;
      // Kill the process holding port 9190, then retry
      try {
        const pid = execSync(
          `fuser 9190/tcp 2>/dev/null || ss -tlnp 2>/dev/null | grep ":9190" | grep -oP "pid=\\K\\d+"`,
          { encoding: "utf8", timeout: 3000 }
        ).trim().split("\n").pop() || "";
        if (pid) {
          execSync(`kill -9 ${pid} 2>/dev/null`, { timeout: 2000 });
          process.stderr.write(`[hbridge] Killed PID ${pid}\n`);
        }
      } catch { /* fuser/ss unavailable */ }
      setTimeout(() => startInboxServer(users, bridge), 300);
      return;
    }
    process.stderr.write(`[hbridge] HTTP server error: ${err.message}\n`);
    markStopped();
    inboxServer = null;
  });

  inboxServer.listen(9190);
}

// ─── MCP tools ────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: "hbridge_enable",
    description: "Start hbridge server and generate access key",
    inputSchema: {
      type: "object",
      properties: { user: { type: "string" } },
    },
  },
  {
    name: "hbridge_disable",
    description: "Stop hbridge server",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "hbridge_status",
    description: "Show hbridge server status",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "hbridge_user_add",
    description: "Add a new user",
    inputSchema: {
      type: "object",
      properties: { name: { type: "string" } },
      required: ["name"],
    },
  },
  {
    name: "hbridge_user_list",
    description: "List all users",
    inputSchema: { type: "object", properties: {} },
  },
];

function respond(obj) {
  process.stdout.write(JSON.stringify(obj) + "\n");
}
