import http from "http";
import { randomUUID } from "crypto";
import { execSync } from "child_process";
import { Bridge } from "./bridge.mjs";
import { markRunning, markStopped, readState, writeState } from "./state.mjs";
import { homePort, homeKey } from "./home.mjs";

export function startMcpServer() {
  // Global crash protection — keep MCP alive even if something slips through
  process.on("uncaughtException", (err) => {
    process.stderr.write(`[hbridge] UNCAUGHT: ${err.message}\n`);
  });
  process.on("unhandledRejection", (err) => {
    process.stderr.write(`[hbridge] UNHANDLED: ${err}\n`);
  });

  const key = homeKey(process.cwd());
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
        handleMcp(JSON.parse(line), key, bridge);
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

function handleMcp(msg, key, bridge) {
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
      const { name } = params;
    let t = "";
    if (name === "hbridge_enable") {
      const port = homePort(process.cwd());
      const k = homeKey(process.cwd());
      startInboxServer(k, bridge);
      markRunning(port);
      t = k;
    } else if (name === "hbridge_disable") {
      if (inboxServer) {
        const srv = inboxServer;
        inboxServer = null;
        srv.close((err) => {
          if (err) process.stderr.write(`[hbridge] close error: ${err.message}\n`);
        });
      }
      markStopped();
      t = "disabled";
    } else if (name === "hbridge_status") {
      const state = readState();
      if (!state.running) {
        t = "hbridge stopped";
      } else {
        const port = state.port || homePort(process.cwd());
        t = `hbridge running on :${port}`;
        if (state.lastClientIP) {
          t += ` | Last: ${state.lastClientIP} at ${new Date(state.lastActiveAt).toLocaleString()}`;
        }
      }
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

function startInboxServer(expectedKey, bridge) {
  if (inboxServer && inboxServer.listening) return;

  const port = homePort(process.cwd());
  process.stderr.write(`[hbridge] HTTP inbox starting on :${port}\n`);

  inboxServer = http.createServer((req, res) => {
    try {
      // Health check — no auth required (used by statusline liveness)
      if (req.url === "/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "ok" }));
        return;
      }

      // Auth (skip in home mode)
      if (process.env.HBRIDGE_HOME != 1) {
        const auth = req.headers["authorization"] || "";
        const providedKey = Buffer.from(auth.split(" ")[1] || "", "base64")
          .toString().split(":")[1];
        if (providedKey !== expectedKey) {
          res.writeHead(401);
          res.end("Unauthorized");
          return;
        }
      }

      // Track connection info
      const clientIP = req.socket.remoteAddress?.replace(/^::ffff:/, "") || "unknown";
      writeState({ lastClientIP: clientIP, lastActiveAt: Date.now() });

      const [_, v, endpoint, actionRaw] = req.url.split("/");
      const action = actionRaw ? actionRaw.split("?")[0] : "";

      if (endpoint === "task" && action === "create" && req.method === "POST") {
        let body = "";
        req.on("data", (d) => (body += d));
        req.on("end", () => {
          try {
            const prompt = JSON.parse(body).prompt || "";
            const taskId = `task_${randomUUID()}`;
            bridge.createTask(prompt, taskId).catch(() => {});
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ task_id: taskId, status: "created" }));
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

  // Mark running only after successful listen
  inboxServer.on("listening", () => {
    markRunning(port);
    process.stderr.write(`[hbridge] HTTP inbox listening on :${port}\n`);
  });

  inboxServer.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      process.stderr.write(`[hbridge] Port ${port} in use — killing old process\n`);
      inboxServer = null;
      // Kill the process holding port, then retry
      try {
        const pid = execSync(
          `fuser ${port}/tcp 2>/dev/null || ss -tlnp 2>/dev/null | grep ":${port}" | grep -oP "pid=\\K\\d+"`,
          { encoding: "utf8", timeout: 3000 }
        ).trim().split("\n").pop() || "";
        if (pid) {
          execSync(`kill -9 ${pid} 2>/dev/null`, { timeout: 2000 });
          process.stderr.write(`[hbridge] Killed PID ${pid}\n`);
        }
      } catch { /* fuser/ss unavailable */ }
      setTimeout(() => startInboxServer(expectedKey, bridge), 300);
      return;
    }
    process.stderr.write(`[hbridge] HTTP server error: ${err.message}\n`);
    markStopped();
    inboxServer = null;
  });

  inboxServer.listen(port);
}

// ─── MCP tools ────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: "hbridge_enable",
    description: "Start hbridge server and generate access key",
    inputSchema: {
      type: "object",
      properties: {},
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
];

function respond(obj) {
  process.stdout.write(JSON.stringify(obj) + "\n");
}
