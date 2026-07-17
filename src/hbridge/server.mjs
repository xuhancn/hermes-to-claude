/**
 * Unified HTTP + MCP server for hbridge.
 * Merged from old server.mjs + mcp.mjs — single source for all HTTP + MCP.
 */
import http from "http";
import { randomUUID } from "crypto";
import { execSync } from "child_process";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { homedir } from "os";
import { Bridge } from "./bridge.mjs";
import { markRunning, markStopped, readState, writeState, incrementTasks } from "./state.mjs";
import { homePort, homeKey, isHome } from "./home.mjs";

const distDir = dirname(fileURLToPath(import.meta.url));
const HBRIDGE_STATUSLINE_CMD = `node ${join(distDir, "statusline.mjs")}`;
const USER_SETTINGS = join(homedir(), ".claude", "settings.json");
const USER_CMD_FILE = join(homedir(), ".hbridge_user_statusline_cmd");
let taskCount = 0, startTime = Date.now();

export const TOOLS = [
  { name: "hbridge_enable", description: "Start hbridge server", inputSchema: { type: "object", properties: {} } },
  { name: "hbridge_disable", description: "Stop hbridge server", inputSchema: { type: "object", properties: {} } },
  { name: "hbridge_status", description: "Show hbridge server status", inputSchema: { type: "object", properties: {} } },
  { name: "hbridge_status_bar", description: "Show/hide hbridge status bar", inputSchema: { type: "object", properties: { action: { type: "string", enum: ["on", "off"] } }, required: ["action"] } },
];

function respond(obj) { process.stdout.write(JSON.stringify(obj) + "\n"); }

function handleMcp(msg, key, bridge, inboxServerRef) {
  const { method, params, id } = msg;
  if (method === "notifications/initialized") return;
  if (method === "initialize") {
    respond({ jsonrpc: "2.0", id, result: { protocolVersion: "2024-11-05", capabilities: { tools: { listChanged: true } }, serverInfo: { name: "hbridge", version: "1.0.0" } } });
  } else if (method === "tools/list") {
    respond({ jsonrpc: "2.0", id, result: { tools: TOOLS } });
  } else if (method === "tools/call") {
    try {
      const { name } = params; let t = "";
      if (name === "hbridge_enable") { const port = homePort(process.cwd()); const k = homeKey(process.cwd()); startInboxServer(k, bridge); markRunning(port); t = k; }
      else if (name === "hbridge_disable") { if (inboxServerRef.current) { const srv = inboxServerRef.current; inboxServerRef.current = null; srv.close(() => {}); } markStopped(); t = "disabled"; }
      else if (name === "hbridge_status") { const state = readState(); if (!state.running) t = "hbridge stopped"; else { const port = state.port || homePort(process.cwd()); t = `hbridge running on :${port}`; if (state.lastClientIP) t += ` | Last: ${state.lastClientIP}`; } }
      else if (name === "hbridge_status_bar") {
        const action = params?.arguments?.action; if (!action || !["on", "off"].includes(action)) throw new Error('action must be "on" or "off"');
        let settings = {}; if (existsSync(USER_SETTINGS)) settings = JSON.parse(readFileSync(USER_SETTINGS, "utf8"));
        if (action === "on") { const c = settings.statusLine?.command || ""; if (c && !c.includes("statusline.mjs")) { mkdirSync(dirname(USER_CMD_FILE), { recursive: true }); writeFileSync(USER_CMD_FILE, c, "utf8"); } settings.statusLine = { type: "command", command: HBRIDGE_STATUSLINE_CMD }; t = "on"; }
        else { if (existsSync(USER_CMD_FILE)) { const u = readFileSync(USER_CMD_FILE, "utf8").trim(); if (u) settings.statusLine = { type: "command", command: u }; else delete settings.statusLine; writeFileSync(USER_CMD_FILE, "", "utf8"); } else delete settings.statusLine; t = "off"; }
        mkdirSync(dirname(USER_SETTINGS), { recursive: true }); writeFileSync(USER_SETTINGS, JSON.stringify(settings, null, 2));
      }
      respond({ jsonrpc: "2.0", id, result: { content: [{ type: "text", text: t }] } });
    } catch (e) { respond({ jsonrpc: "2.0", id, error: { code: -32603, message: `hbridge error: ${e.message}` } }); }
  }
}

export function startMcpServer() {
  process.on("uncaughtException", (err) => process.stderr.write(`[hbridge] UNCAUGHT: ${err.message}\n`));
  process.on("unhandledRejection", (err) => process.stderr.write(`[hbridge] UNHANDLED: ${err}\n`));
  const key = homeKey(process.cwd()); const bridge = new Bridge(); const ref = { current: null };
  if (process.env.HBRIDGE_HOME === "1") startInboxServer(key, bridge, ref);
  let buf = "";
  process.stdin.on("data", (chunk) => { buf += chunk.toString(); while (buf.includes("\n")) { const i = buf.indexOf("\n"); const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1); if (!line) continue; try { handleMcp(JSON.parse(line), key, bridge, ref); } catch (e) { respond({ jsonrpc: "2.0", error: { code: -32700, message: "Parse error" }, id: null }); } } });
}

export function createServer(expectedKey, bridge) {
  return http.createServer((req, res) => {
    try {
      if (req.method === "OPTIONS") { res.writeHead(204); return res.end(); }
      if (req.url === "/health") { res.writeHead(200, { "Content-Type": "application/json" }); return res.end(JSON.stringify({ status: "ok" })); }
      if (!isHome()) {
        const auth = req.headers["authorization"] || "";
        const k = Buffer.from(auth.split(" ")[1] || "", "base64").toString().split(":")[1];
        if (k !== expectedKey) { res.writeHead(401); return res.end("Unauthorized"); }
      }
      const ip = req.socket.remoteAddress?.replace(/^::ffff:/, "") || "unknown";
      writeState({ lastClientIP: ip, lastActiveAt: Date.now() });
      const isPost = req.method === "POST";
      const [_, v, endpoint, action, subaction] = req.url.split("/");
      if (isPost) { let body = ""; req.on("data", d => body += d); req.on("end", () => { try { handlePost(req, res, body, endpoint, action, bridge); } catch (e) { res.writeHead(400); res.end(JSON.stringify({ error: e.message })); } }); return; }
      handleGet(req, res, endpoint, action, subaction, bridge);
    } catch (e) { res.writeHead(500); res.end(JSON.stringify({ error: e.message })); }
  });
}

function handlePost(req, res, body, endpoint, action, bridge) {
  const p = body ? JSON.parse(body) : {};
  if (endpoint === "task" && action === "create") {
    taskCount++; incrementTasks();
    bridge.createTask(p.prompt, undefined, { cwd: p.cwd }).then(r => { res.writeHead(200, { "Content-Type": "application/json" }); res.end(JSON.stringify(r)); }).catch(e => { res.writeHead(400); res.end(JSON.stringify({ error: e.message })); });
    return;
  }
  if (endpoint === "task" && action === "cancel") {
    if (!p.task_id) { res.writeHead(400); return res.end(JSON.stringify({ error: "task_id required" })); }
    const ok = bridge.cancelTask(p.task_id);
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify(ok ? { status: "cancelled", task_id: p.task_id } : { error: "not_found" }));
  }
  res.writeHead(404); res.end(JSON.stringify({ error: "not_found" }));
}

function handleGet(req, res, endpoint, action, subaction, bridge) {
  if (endpoint === "task" && action === "output" && subaction === "stream") {
    const taskId = new URL("http://localhost" + req.url).searchParams.get("task_id");
    if (!taskId) { res.writeHead(400); return res.end(JSON.stringify({ error: "task_id required" })); }
    res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive", "X-Accel-Buffering": "no" });
    res.write("data: " + JSON.stringify({ type: "connected", taskId }) + "\n\n");
    const sub = { write: d => { try { res.write(d); } catch { cleanup(); } } };
    const cleanup = () => { try { bridge.unsubscribeTask(taskId, sub); } catch {} try { res.end(); } catch {} };
    bridge.subscribeTask(taskId, sub); req.on("close", cleanup); return;
  }
  if (endpoint === "task" && action === "output") {
    const taskId = new URL("http://localhost" + req.url).searchParams.get("task_id");
    const result = bridge.getTaskOutput(taskId) || { error: "not_found" };
    res.writeHead(200, { "Content-Type": "application/json" }); return res.end(JSON.stringify(result));
  }
  if (endpoint === "task") {
    const taskId = new URL("http://localhost" + req.url).searchParams.get("task_id");
    const result = bridge.getTask(taskId) || { error: "not_found" };
    res.writeHead(200, { "Content-Type": "application/json" }); return res.end(JSON.stringify(result));
  }
  res.writeHead(404); res.end(JSON.stringify({ error: "not_found" }));
}

export function startInboxServer(expectedKey, bridge, inboxServerRef) {
  const ref = inboxServerRef || { current: null };
  if (ref.current && ref.current.listening) return;
  const port = homePort(process.cwd());
  process.stderr.write("[hbridge] HTTP inbox starting on :" + port + "\n");
  const srv = createServer(expectedKey, bridge); ref.current = srv;
  srv.on("listening", () => { markRunning(port); process.stderr.write("[hbridge] HTTP inbox listening on :" + port + "\n"); });
  srv.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      process.stderr.write("[hbridge] Port " + port + " in use\n"); ref.current = null;
      try { const pid = execSync("fuser " + port + "/tcp 2>/dev/null || ss -tlnp 2>/dev/null | grep ':" + port + "' | grep -oP 'pid=\\K\\d+'", { encoding: "utf8", timeout: 3000 }).trim().split("\n").pop() || ""; if (pid) { execSync("kill -9 " + pid + " 2>/dev/null", { timeout: 2000 }); } } catch {}
      setTimeout(() => startInboxServer(expectedKey, bridge, ref), 300); return;
    }
    process.stderr.write("[hbridge] HTTP server error: " + err.message + "\n"); markStopped(); ref.current = null;
  });
  srv.listen(port);
}

export function startStatusBar(port) {
  function r() { process.stdout.write("\r  hbridge: on | port: " + port + " | " + taskCount + " tasks | " + Math.floor((Date.now()-startTime)/60000) + "min  "); }
  r(); return setInterval(r, 5000);
}
export function stopStatusBar(id) { clearInterval(id); }
