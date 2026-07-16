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
      catch { respond({ jsonrpc: "2.0", error: { code: -32700, message: "Parse error" }, id: null }); }
    }
  });
}

function handleMcp(msg, users, bridge) {
  const { method, params, id } = msg;
  if (method === "initialize") respond({ jsonrpc: "2.0", id, result: { protocolVersion: "1.0", capabilities: { tools: {} }, serverInfo: { name: "hbridge", version: "1.0.0" } } });
  else if (method === "tools/list") respond({ jsonrpc: "2.0", id, result: { tools: [{ name: "hbridge_enable", description: "Start hbridge" }, { name: "hbridge_status", description: "Show status" }] } });
  else if (method === "tools/call") {
    const { name, arguments: args = {} } = params;
    let t = "";
    if (name === "hbridge_enable") { const u = users.list(); t = u[args.user || "bridge"] ? u[args.user || "bridge"].key : users.add(args.user || "bridge"); }
    else if (name === "hbridge_status") t = "running";
    respond({ jsonrpc: "2.0", id, result: { content: [{ type: "text", text: t }] } });
  }
}

function respond(obj) { process.stdout.write(JSON.stringify(obj) + "\n"); }
