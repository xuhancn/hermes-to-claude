#!/usr/bin/env node
import { startMcpServer } from "./mcp.mjs";
import { createServer, startStatusBar } from "./server.mjs";
import { UserManager } from "./users.mjs";
import { markRunning, markStopped } from "./state.mjs";
import { COLORS, log } from "./utils.mjs";
import { networkInterfaces } from "os";
import { isHome, homePort } from "./home.mjs";

const HBRIDGE_VERSION = globalThis.HBRIDGE_VERSION || "v0.0.0-dev";
const PORT = isHome() ? homePort(process.cwd()) : 9190;
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

  if (isHome()) {
    // Home mode: no auth, no user management needed, localhost only
    console.log(`\n  ╔══════════════════════════════════╗
  ║  hbridge home mode   ${HBRIDGE_VERSION}  ║
  ║  Addr:  127.0.0.1:${PORT}             ║
  ╚══════════════════════════════════╝
`);
  } else {
    if (!username) {
      process.stdout.write("  Username: ");
      username = await new Promise(r => {
        process.stdin.once("data", d => r(d.toString().trim()));
      });
    }

    // Reuse existing key if user already exists
    let key;
    if (users.list()[username]) {
      key = users.list()[username].key;
    } else {
      key = users.add(username);
    }
    const ips = getLocalIPs();

    console.log(`
  ╔══════════════════════════════════╗
  ║  ${COLORS.yellow}⚠ H-Bridge enabled${COLORS.reset}   ${HBRIDGE_VERSION}  ║
  ║  Remote access is now allowed    ║
  ║                                  ║
  ║  User:   ${username.padEnd(22)}║
  ║  Key:    ${key.padEnd(22)}║
  ║  Addr:   127.0.0.1:${PORT}          ║`);
    for (const ip of ips) {
      console.log(`  ║         ${(ip + ":" + PORT).padEnd(22)}║`);
    }
    console.log(`  ║                                  ║
  ║  Save this key — shown once      ║
  ╚══════════════════════════════════╝
`);
  }

  server = createServer(users);
  server.listen(PORT, isHome() ? "127.0.0.1" : undefined);
  markRunning(PORT, Object.keys(users.list()));

  startStatusBar(PORT);
  process.stdin.resume();
}

function cmd_disable() {
  if (server) {
    server.close();
    server = null;
  }
  markStopped();
  if (statusInterval) {
    clearInterval(statusInterval);
    statusInterval = null;
  }
  console.log("  hbridge: off");
  process.exit(0);
}

function cmd_status() {
  const users = new UserManager();
  const ips = getLocalIPs();
  console.log(`
  ══════════════════════════
  hbridge ${HBRIDGE_VERSION}
  Status:    ${server ? "enabled" : "disabled"}
  Port:      ${PORT}
  Users:     ${Object.keys(users.list()).length}`);
  if (ips.length > 0) {
    console.log(`  LAN:       ${ips.map(ip => ip + ":" + PORT).join(", ")}`);
  }
  console.log(`  ══════════════════════════
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
    } else if (cmd === "--stdio") { startMcpServer(); }
else if (cmd === "--help" || cmd === "-h") { showHelp(); }
else {
      for (const [n, info] of Object.entries(list)) {
        console.log(`  ${n}  (${new Date(info.created).toISOString().slice(0,10)})`);
      }
    }
  }
}

function showHelp() {
  console.log(`
  hbridge — Hermes Bridge 

  COMMANDS:
    hbridge --enable [-u user]   Start bridge + generate key
    hbridge --disable            Stop bridge
    hbridge --status             Show detailed status
    hbridge --help               Show this help

  USER MANAGEMENT:
    hbridge --user add [name]    Add user
    hbridge --user del <name>    Delete user
    hbridge --user key <name>    Regenerate key
    hbridge --user list          List all users

  EXAMPLES:
    hbridge --enable             First start, enter username
    hbridge --enable xu          Start as xu
    hbridge --user add han       Add user han
    hbridge --status             Show active connections
  `);
  process.exit(0);
}

const args = process.argv.slice(2);
const cmd = args[0];
const sub = args[1];
const val = args[2];

// Home mode: block manual enable/disable
if (isHome() && (cmd === "--enable" || cmd === "--disable")) {
  console.log("Home mode active — manual control disabled");
  process.exit(0);
}

if (cmd === "--enable") cmd_enable(sub);
else if (cmd === "--disable") cmd_disable();
else if (cmd === "--status") cmd_status();
else if (cmd === "--user") cmd_user(sub, val);
else if (cmd === "--stdio") { startMcpServer(); }
else if (cmd === "--help" || cmd === "-h") { showHelp(); }
else if (isHome()) { cmd_enable("local"); }
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
