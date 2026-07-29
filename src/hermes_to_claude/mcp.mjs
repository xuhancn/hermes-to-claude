import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { homedir, networkInterfaces } from "os";
import { Bridge } from "./bridge.mjs";
import { markRunning, markStopped, readState, writeState } from "./state.mjs";
import { homePort, homeKey } from "./home.mjs";
import { createServer } from "./server.mjs";

const H2C_VERSION = globalThis.H2C_VERSION || "v0.0.0-dev";

function getLocalIPs() {
  const ips = [];
  const ifaces = networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) ips.push(iface.address);
    }
  }
  return ips;
}

// ─── Paths for status bar toggle ────────────────────────────────────────

const distDir = dirname(fileURLToPath(import.meta.url));
const H2C_STATUSLINE_CMD = `node ${join(distDir, "statusline.mjs")}`;
const USER_SETTINGS = join(homedir(), ".claude", "settings.json");
const USER_CMD_FILE = join(homedir(), ".h2c_user_statusline_cmd");

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
    process.stderr.write(`[h2c] UNCAUGHT: ${err.message}\n`);
  });
  process.on("unhandledRejection", (err) => {
    process.stderr.write(`[h2c] UNHANDLED: ${err}\n`);
  });

  const key = homeKey(process.cwd());
  mcpBridge = new Bridge();

  // Home Mode — auto-start HTTP server (no enable needed)
  if (process.env.H2C_HOME === "1") {
    const port = homePort(process.cwd());
    httpServer = createServer(key, mcpBridge);
    httpServer.on("error", (err) => {
      process.stderr.write(`[h2c] HTTP server error: ${err.message}\n`);
      httpServer = null;
    });
    httpServer.listen(port);
    markRunning(port);
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
        serverInfo: { name: "h2c", version: "1.0.0" },
      },
    });
  } else if (method === "tools/list") {
    respond({ jsonrpc: "2.0", id, result: { tools: TOOLS } });
  } else if (method === "tools/call") {
    try {
      const { name } = params;
    let t = "";
    if (name === "h2c_enable") {
      const port = homePort(process.cwd());
      const k = homeKey(process.cwd());
      if (!httpServer) {
        httpServer = createServer(k, mcpBridge);
        httpServer.on("error", (err) => {
          process.stderr.write(`[h2c] HTTP server error: ${err.message}\n`);
          httpServer = null;
        });
        httpServer.listen(port);
      }
      markRunning(port);
      const ips = getLocalIPs();
      const ip = isHome() ? "127.0.0.1" : (ips[0] || "127.0.0.1");
      t = `h2c enabled
📂 ${process.cwd()}
🔑 ${ip}:${port} | ${k} | ${H2C_VERSION}
👉 Hermes-Agent → https://github.com/xuhancn/hermes-to-claude#3-for-hermes-agent`;
    } else if (name === "h2c_disable") {
      if (httpServer) {
        const srv = httpServer;
        httpServer = null;
        srv.close((err) => {
          if (err) process.stderr.write(`[h2c] close error: ${err.message}\n`);
        });
      }
      markStopped();
      t = "disabled";
    } else if (name === "h2c_status") {
      const state = readState();
      if (!state.running) {
        t = "h2c stopped";
      } else {
        const port = state.port || homePort(process.cwd());
        const ips2 = getLocalIPs();
        const ip2 = isHome() ? "127.0.0.1" : (ips2[0] || "127.0.0.1");
        t = `h2c running on :${port}`;
        t += `\n📂 ${process.cwd()}`;
        t += `\n🔑 ${ip2}:${port}`;
        if (state.lastClientIP) {
          t += `\nLast client: ${state.lastClientIP} at ${new Date(state.lastActiveAt).toLocaleString()}`;
        }
      }
    } else if (name === "h2c_status_bar") {
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
        // Save user's command (unless it's already h2c's wrapper)
        if (currentCmd && !currentCmd.includes("statusline.mjs")) {
          mkdirSync(dirname(USER_CMD_FILE), { recursive: true });
          writeFileSync(USER_CMD_FILE, currentCmd, "utf8");
        }
        settings.statusLine = { type: "command", command: H2C_STATUSLINE_CMD };
        t = "h2c status bar ON — attached to your status bar";
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
        t = "h2c status bar OFF";
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
        error: { code: -32603, message: `h2c error: ${e.message}` },
      });
    }
  }
}

// ─── Shared HTTP server ────────────────────────────────────────────────

let mcpBridge = null;
let httpServer = null;

// ─── MCP tools ────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: "h2c_enable",
    description: "Start h2c server. Always display the full output: cwd, IP, port, key, and version.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "h2c_disable",
    description: "Stop h2c server",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "h2c_status",
    description: "Show h2c server status. Display: port, cwd, IP, and last client.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "h2c_status_bar",
    description: "Show/hide h2c status in Claude Code status bar (attaches to your existing bar)",
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
