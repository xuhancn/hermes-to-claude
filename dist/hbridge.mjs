#!/usr/bin/env node
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});

// src/hbridge/server.mjs
import { createServer as http } from "http";

// src/hbridge/bridge.mjs
import { spawn } from "child_process";
import { mkdirSync, writeFileSync } from "fs";
var TASKS_DIR = "./hbridge_tasks";
var Bridge = class {
  constructor() {
    this.tasks = /* @__PURE__ */ new Map();
    this.taskIdx = 0;
    mkdirSync(TASKS_DIR, { recursive: true });
  }
  async createTask(prompt) {
    const id = `task_${++this.taskIdx}`;
    const task = { id, prompt, status: "running", result: "", exitCode: null, created: Date.now() };
    this.tasks.set(id, task);
    const promptFile = `${TASKS_DIR}/${id}_prompt.txt`;
    writeFileSync(promptFile, prompt);
    const child = spawn("npx", ["@anthropic-ai/claude-code", "-p", prompt], {
      cwd: process.cwd(),
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env }
    });
    let output = "";
    child.stdout.on("data", (d) => {
      output += d.toString();
      task.result = output;
    });
    child.stderr.on("data", (d) => {
      output += d.toString();
      task.result = output;
    });
    child.on("close", (code) => {
      task.status = "done";
      task.exitCode = code;
      task.result = output || "(no output)";
      writeFileSync(`${TASKS_DIR}/${id}.txt`, output || "");
    });
    child.on("error", (err) => {
      task.status = "failed";
      task.result = err.message;
    });
    return { task_id: id, status: "created" };
  }
  getTask(id) {
    const t = this.tasks.get(id);
    return t ? { id: t.id, status: t.status, created: t.created } : null;
  }
  getTaskOutput(id) {
    const t = this.tasks.get(id);
    if (!t) return null;
    return {
      retrieval_status: t.status === "done" ? "success" : t.status === "failed" ? "failed" : "pending",
      task: { id: t.id, status: t.status, result: t.result, exitCode: t.exitCode }
    };
  }
};

// src/hbridge/server.mjs
var taskCount = 0;
var startTime = Date.now();
var bridge = new Bridge();
function createServer(users) {
  return http((req, res) => {
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      return res.end();
    }
    if (req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ status: "ok" }));
    }
    const auth = req.headers["authorization"] || "";
    const [username, key] = Buffer.from(auth.split(" ")[1] || "", "base64").toString().split(":");
    if (!users.verify(username, key)) {
      res.writeHead(401);
      return res.end("Unauthorized");
    }
    const isPost = req.method === "POST";
    let body = "";
    function handle() {
      try {
        let result = {};
        let status = 200;
        const payload = body ? JSON.parse(body) : {};
        const [_, v, endpoint, action] = req.url.split("/");
        if (endpoint === "task" && action === "create" && isPost) {
          taskCount++;
          result = bridge.createTask(payload.prompt);
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
      req.on("data", (d) => body += d);
      req.on("end", handle);
    } else {
      handle();
    }
  });
}
function startStatusBar(port) {
  function render() {
    const uptime = Math.floor((Date.now() - startTime) / 6e4);
    process.stdout.write(`\r  hbridge: on | port: ${port} | ${taskCount} tasks | \u2191 ${uptime}min  `);
  }
  render();
  setInterval(render, 5e3);
}

// src/hbridge/users.mjs
import { randomBytes } from "crypto";
import { readFileSync, writeFileSync as writeFileSync2, existsSync } from "fs";
var BASE52 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
var DB = "./hbridge_users.json";
var UserManager = class {
  constructor() {
    this.users = existsSync(DB) ? JSON.parse(readFileSync(DB, "utf8")) : {};
  }
  add(username) {
    const key = Array.from({ length: 8 }, () => BASE52[randomBytes(1)[0] % 52]).join("");
    const formatted = "hb_" + key.slice(0, 4) + "-" + key.slice(4);
    this.users[username] = { key, created: Date.now() };
    this._save();
    return formatted;
  }
  del(username) {
    delete this.users[username];
    this._save();
  }
  regenerate(username) {
    const key = Array.from({ length: 8 }, () => BASE52[randomBytes(1)[0] % 52]).join("");
    const formatted = "hb_" + key.slice(0, 4) + "-" + key.slice(4);
    this.users[username] = { key, created: Date.now() };
    this._save();
    return formatted;
  }
  list() {
    return this.users;
  }
  verify(username, key) {
    const u = this.users[username];
    if (!u) return false;
    const flat = key.replace("-", "");
    return u.key === flat || u.key === key;
  }
  _save() {
    writeFileSync2(DB, JSON.stringify(this.users, null, 2));
  }
};

// src/hbridge/utils.mjs
var COLORS = { yellow: "\x1B[33m", reset: "\x1B[0m" };

// src/hbridge/cli.mjs
import { networkInterfaces } from "os";
var PORT = 9190;
var server = null;
var statusInterval = null;
function getLocalIPs() {
  return Object.values(networkInterfaces()).flat().filter((n) => n.family === "IPv4" && !n.internal).map((n) => n.address);
}
async function cmd_enable(username) {
  const users = new UserManager();
  if (!username) {
    process.stdout.write("  Username: ");
    username = await new Promise((r) => {
      process.stdin.once("data", (d) => r(d.toString().trim()));
    });
  }
  const key = users.add(username);
  const ips = getLocalIPs();
  console.log(`
  \u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557
  \u2551  ${COLORS.yellow}\u26A0 H-Bridge enabled${COLORS.reset}             \u2551
  \u2551  Remote access is now allowed    \u2551
  \u2551                                  \u2551
  \u2551  User:   ${username.padEnd(22)}\u2551
  \u2551  Key:    ${key.padEnd(22)}\u2551
  \u2551  Addr:   127.0.0.1:${PORT}          \u2551`);
  for (const ip of ips) {
    console.log(`  \u2551          ${ip.padEnd(22)}\u2551`);
  }
  console.log(`  \u2551                                  \u2551
  \u2551  Save this key \u2014 shown once      \u2551
  \u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D
`);
  server = createServer(users);
  server.listen(PORT);
  startStatusBar(PORT);
  process.stdin.resume();
}
function cmd_disable() {
  if (server) {
    server.close();
    server = null;
  }
  if (statusInterval) {
    clearInterval(statusInterval);
    statusInterval = null;
  }
  console.log("  hbridge: off");
  process.exit(0);
}
function cmd_status() {
  const users = new UserManager();
  console.log(`
  \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
  Status:    ${server ? "enabled" : "disabled"}
  Port:      ${PORT}
  Users:     ${Object.keys(users.list()).length}
  \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
`);
  const list = users.list();
  for (const [name, info] of Object.entries(list)) {
    console.log(`  ${name}  created: ${new Date(info.created).toISOString().slice(0, 10)}`);
  }
}
function cmd_user(action, name) {
  const users = new UserManager();
  if (action === "add") {
    process.stdout.write("  Add user: ");
    name = name || __require("fs").readFileSync(0, "utf8").trim();
    const key = users.add(name);
    console.log(`  User: ${name}  Key: ${key}`);
  } else if (action === "del") {
    users.del(name);
    console.log(`  Deleted: ${name}`);
  } else if (action === "key") {
    const key = users.regenerate(name);
    console.log(`  New key for ${name}: ${key}`);
  } else if (action === "list") {
    const list = users.list();
    if (Object.keys(list).length === 0) {
      console.log("  No users");
    } else {
      for (const [n, info] of Object.entries(list)) {
        console.log(`  ${n}  (${new Date(info.created).toISOString().slice(0, 10)})`);
      }
    }
  }
}
var args = process.argv.slice(2);
var cmd = args[0];
var sub = args[1];
var val = args[2];
if (cmd === "--enable") cmd_enable(val);
else if (cmd === "--disable") cmd_disable();
else if (cmd === "--status") cmd_status();
else if (cmd === "--user") cmd_user(sub, val);
else {
  console.log("hbridge \u2014 Hermes Bridge");
  console.log("  hbridge --enable [-u user]   Start bridge");
  console.log("  hbridge --disable            Stop bridge");
  console.log("  hbridge --status             Show status");
  console.log("  hbridge --user add [name]    Add user");
  console.log("  hbridge --user del <name>    Delete user");
  console.log("  hbridge --user key <name>    Regenerate key");
  console.log("  hbridge --user list          List users");
}
