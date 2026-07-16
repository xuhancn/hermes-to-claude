import { UserManager } from "./users.mjs";
import { Bridge } from "./bridge.mjs";

export function startMcpServer() {
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
      try { handleMcp(JSON.parse(line), users, bridge); }
      catch(e) { respond({ jsonrpc: "2.0", error: { code: -32700, message: "Parse error" }, id: null }); }
    }
  });
}

function handleMcp(msg, users, bridge) {
  const { method, params, id } = msg;
  if (method === "notifications/initialized") return;
  if (method === "initialize") {
    respond({ jsonrpc: "2.0", id, result: {
      protocolVersion: "2024-11-05",
      capabilities: { tools: {} },
      serverInfo: { name: "hbridge", version: "1.0.0" }
    }});
  }
  else if (method === "tools/list") {
    respond({ jsonrpc: "2.0", id, result: { tools: TOOLS }});
  }
  else if (method === "tools/call") {
    const { name, arguments: args = {} } = params;
    let t = "";
    if (name === "hbridge_enable") { const u = users.list(); t = u[args.user || "bridge"] ? u[args.user || "bridge"].key : users.add(args.user || "bridge"); }
    else if (name === "hbridge_disable") t = "disabled";
    else if (name === "hbridge_status") t = JSON.stringify({ running: true, users: Object.keys(users.list()) });
    else if (name === "hbridge_user_add") { t = users.add(args.name); }
    else if (name === "hbridge_user_list") { t = JSON.stringify(users.list()); }
    respond({ jsonrpc: "2.0", id, result: { content: [{ type: "text", text: t }] }});
  }
}

const TOOLS = [
  { name: "hbridge_enable", description: "Start hbridge server and generate access key", inputSchema: { type: "object", properties: { user: { type: "string" } } } },
  { name: "hbridge_disable", description: "Stop hbridge server", inputSchema: { type: "object", properties: {} } },
  { name: "hbridge_status", description: "Show hbridge server status", inputSchema: { type: "object", properties: {} } },
  { name: "hbridge_user_add", description: "Add a new user", inputSchema: { type: "object", properties: { name: { type: "string" } }, required: ["name"] } },
  { name: "hbridge_user_list", description: "List all users", inputSchema: { type: "object", properties: {} } },
];

function respond(obj) { process.stdout.write(JSON.stringify(obj) + "\n"); }
