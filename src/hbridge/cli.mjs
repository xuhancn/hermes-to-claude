#!/usr/bin/env node
import { createServer, startStatusBar } from "./server.mjs";
import { UserManager } from "./users.mjs";
import { COLORS, log } from "./utils.mjs";
import { networkInterfaces } from "os";

const PORT = 9190;
let server = null;
let statusInterval = null;

function getLocalIPs() {
  return Object.values(networkInterfaces())
    .flat()
    .filter(n => n.family === "IPv4" && !n.internal)
    .map(n => n.address);
}

async function cmd_enable(username) {
  const users = new UserManager();
  
  if (!username) {
    process.stdout.write("  Username: ");
    username = await new Promise(r => {
      process.stdin.once("data", d => r(d.toString().trim()));
    });
  }

  const key = users.add(username);
  const ips = getLocalIPs();
  
  console.log(`
  ╔══════════════════════════════════╗
  ║  ${COLORS.yellow}⚠ H-Bridge enabled${COLORS.reset}             ║
  ║  Remote access is now allowed    ║
  ║                                  ║
  ║  User:   ${username.padEnd(22)}║
  ║  Key:    ${key.padEnd(22)}║
  ║  Addr:   127.0.0.1:${PORT}          ║`);
  for (const ip of ips) {
    console.log(`  ║          ${ip.padEnd(22)}║`);
  }
  console.log(`  ║                                  ║
  ║  Save this key — shown once      ║
  ╚══════════════════════════════════╝
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
  ══════════════════════════
  Status:    ${server ? "enabled" : "disabled"}
  Port:      ${PORT}
  Users:     ${Object.keys(users.list()).length}
  ══════════════════════════
`);
  const list = users.list();
  for (const [name, info] of Object.entries(list)) {
    console.log(`  ${name}  created: ${new Date(info.created).toISOString().slice(0,10)}`);
  }
}

function cmd_user(action, name) {
  const users = new UserManager();
  
  if (action === "add") {
    process.stdout.write("  Add user: ");
    name = name || require("fs").readFileSync(0, "utf8").trim();
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
    } else if (cmd === "--help" || cmd === "-h") { showHelp(); }
else {
      for (const [n, info] of Object.entries(list)) {
        console.log(`  ${n}  (${new Date(info.created).toISOString().slice(0,10)})`);
      }
    }
  }
}

function showHelp() {
  console.log(`
  hbridge — Hermes Bridge 汉的桥

  COMMANDS:
    hbridge --enable [-u user]   启动 Bridge + 生成 Key
    hbridge --disable            关闭 Bridge
    hbridge --status             查看详细状态
    hbridge --help               显示此帮助

  USER MANAGEMENT:
    hbridge --user add [name]    添加用户
    hbridge --user del <name>    删除用户
    hbridge --user key <name>    重新生成 Key
    hbridge --user list          列出所有用户

  EXAMPLES:
    hbridge --enable             首次启动，输入用户名
    hbridge --enable xu          以 xu 身份启动
    hbridge --user add han       添加用户 han
    hbridge --status             查看谁在连
  `);
  process.exit(0);
}

const args = process.argv.slice(2);
const cmd = args[0];
const sub = args[1];
const val = args[2];

if (cmd === "--enable") cmd_enable(sub);
else if (cmd === "--disable") cmd_disable();
else if (cmd === "--status") cmd_status();
else if (cmd === "--user") cmd_user(sub, val);
else if (cmd === "--help" || cmd === "-h") { showHelp(); }
else {
  console.log("hbridge — Hermes Bridge");
  console.log("  hbridge --enable [-u user]   Start bridge");
  console.log("  hbridge --disable            Stop bridge");
  console.log("  hbridge --status             Show status");
  console.log("  hbridge --user add [name]    Add user");
  console.log("  hbridge --user del <name>    Delete user");
  console.log("  hbridge --user key <name>    Regenerate key");
  console.log("  hbridge --user list          List users");
}
