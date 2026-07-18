import { execSync } from "child_process";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { homedir } from "os";
import { Bridge } from "./bridge.mjs";
import { markRunning, markStopped, readState, writeState } from "./state.mjs";
import { homePort, homeKey } from "./home.mjs";
import { createServer } from "./server.mjs";

// ─── Paths for status bar toggle ────────────────────────────────────────

const distDir = dirname(fileURLToPath(import.meta.url));
const HBRIDGE_STATUSLINE_CMD = `node ${join(distDir, "statusline.mjs")}`;
const USER_SETTINGS = join(homedir(), ".claude", "settings.json");
const USER_CMD_FILE = join(homedir(), ".hbridge_user_statusline_cmd");

// ─── MCP server ─────────────────────────────────────────────────────────

export function startMcpServer() {
  // NDJSON guard — redirect non-JSON stdout writes to stderr to prevent
  // third-party console.log from corrupting the JSON-RPC stream.
  const origStdoutWrite = process.stdout.write.bind(process.stdout);
  process.stdout.write = (/** @type {string|Uint8Array} */ chunk, ...args) => {
    const str = typeof chunk === 'string' ? chunk : new TextDecoder().decode(chunk);
    if (str.trim() && !str.trim().startsWith('{') && !str.trim().startsWith('[')) {
      process.stderr.write('[stdout-guard] ' + str);
      return true;
    }
    return origStdoutWrite(chunk, ...args);
  };

  // Global crash protection — keep MCP alive even if something slips through
  process.on("uncaughtException", (err) => {
    process.stderr.write(`[hbridge] UNCAUGHT: ${err.message}\n`);
  });
  process.on("unhandledRejection", (err) => {
    process.stderr.write(`[hbridge] UNHANDLED: ${err}\n`);
  });

  const key = homeKey(process.cwd());
  mcpBridge = new Bridge();

  // Home Mode — auto-start HTTP server (no enable needed)
  if (process.env.HBRIDGE_HOME === "1") {
    ensureHttpServer(key, mcpBridge);
  }

  let buf = "";

  process.stdin.on("data", (chunk) => {
    buf += chunk.toString();
    while (buf.includes("\n")) {
      const i = buf.indexOf("\n");
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (!line) continue;
      try {
        handleMcp(JSON.parse(line), key);
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

function handleMcp(msg, key) {
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
      ensureHttpServer(k, mcpBridge);
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
    } else if (name === "hbridge_status_bar") {
      const action = params?.arguments?.action;
      if (!action || !["on", "off"].includes(action)) {
        throw new Error('action must be "on" or "off"');
      }

      let settings = {};
      if (existsSync(USER_SETTINGS)) {
        settings = JSON.parse(readFileSync(USER_SETTINGS, "utf8"));
      }

      if (action === "on") {
        const currentCmd = settings.statusLine?.command || "";
        // Save user's command (unless it's already hbridge's wrapper)
        if (currentCmd && !currentCmd.includes("statusline.mjs")) {
          mkdirSync(dirname(USER_CMD_FILE), { recursive: true });
          writeFileSync(USER_CMD_FILE, currentCmd, "utf8");
        }
        settings.statusLine = { type: "command", command: HBRIDGE_STATUSLINE_CMD };
        t = "hbridge status bar ON — attached to your status bar";
      } else {
        // Restore user's original command
        if (existsSync(USER_CMD_FILE)) {
          const userCmd = readFileSync(USER_CMD_FILE, "utf8").trim();
          if (userCmd) {
            settings.statusLine = { type: "command", command: userCmd };
          } else {
            delete settings.statusLine;
          }
          writeFileSync(USER_CMD_FILE, "", "utf8");
        } else {
          delete settings.statusLine;
        }
        t = "hbridge status bar OFF";
      }

      mkdirSync(dirname(USER_SETTINGS), { recursive: true });
      writeFileSync(USER_SETTINGS, JSON.stringify(settings, null, 2));
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

// ─── Shared HTTP server ────────────────────────────────────────────────

let inboxServer = null;
let mcpBridge = null;

function ensureHttpServer(expectedKey, br) {
  if (inboxServer && inboxServer.listening) return;
  const port = homePort(process.cwd());
  process.stderr.write(`[hbridge] HTTP server starting on :${port}\n`);
  const srv = createServer(expectedKey, br);
  srv.on("listening", () => {
    markRunning(port);
    process.stderr.write(`[hbridge] HTTP server listening on :${port}\n`);
  });
  srv.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      inboxServer = null;
      process.stderr.write(`[hbridge] Port ${port} in use — killing old process\n`);
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
      setTimeout(() => ensureHttpServer(expectedKey, br), 300);
      return;
    }
    process.stderr.write(`[hbridge] HTTP server error: ${err.message}\n`);
    markStopped();
    inboxServer = null;
  });
  srv.listen(port);
  inboxServer = srv;
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
  {
    name: "hbridge_status_bar",
    description: "Show/hide hbridge status in Claude Code status bar (attaches to your existing bar)",
    inputSchema: {
      type: "object",
      properties: {
        action: { type: "string", enum: ["on", "off"] },
      },
      required: ["action"],
    },
  },
];

function respond(obj) {
  process.stdout.write(JSON.stringify(obj) + "\n");
}
