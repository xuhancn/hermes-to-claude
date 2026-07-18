#!/usr/bin/env node
import { startMcpServer } from "./mcp.mjs";
import { createServer, startStatusBar, stopStatusBar } from "./server.mjs";
import { markRunning, markStopped, readState } from "./state.mjs";
import { networkInterfaces } from "os";
import { isHome, homePort, homeKey } from "./home.mjs";

const HBRIDGE_VERSION = globalThis.HBRIDGE_VERSION || "v0.0.0-dev";
let server = null;
let statusBarInterval = null;

function getLocalIPs() {
  return Object.values(networkInterfaces())
    .flat()
    .filter(n => n.family === "IPv4" && !n.internal)
    .map(n => n.address);
}

async function cmd_enable() {
  const cwd = process.cwd();
  const port = homePort(cwd);
  const key = homeKey(cwd);
  const ips = getLocalIPs();
  const ip = isHome() ? "127.0.0.1" : (ips[0] || "127.0.0.1");

  console.log("hbridge enabled");
  console.log("📂 " + cwd);
  console.log("🔑 " + ip + ":" + port + " | " + key + " | " + HBRIDGE_VERSION);

  server = createServer(key);
  server.listen(port, isHome() ? "127.0.0.1" : undefined);
  markRunning(port);

  statusBarInterval = startStatusBar(port);
  process.stdin.resume();
}

function cmd_disable() {
  if (server) {
    server.close(() => {
      server = null;
      markStopped();
      console.log("  hbridge: off");
      stopStatusBar(statusBarInterval);
      process.exit(0);
    });
    // Fallback: if close hangs, force exit after 1s
    setTimeout(() => process.exit(0), 1000);
  } else {
    markStopped();
    console.log("  hbridge: off");
    process.exit(0);
  }
}

function cmd_status() {
  const cwd = process.cwd();
  const port = homePort(cwd);
  const key = homeKey(cwd);
  const ips = getLocalIPs();
  const state = readState();
  const ip = isHome() ? "127.0.0.1" : (ips[0] || "127.0.0.1");
  const running = state.running;

  console.log(running ? "hbridge enabled" : "hbridge stopped");
  console.log("📂 " + cwd);
  console.log("🔑 " + ip + ":" + port + " | " + key + " | " + HBRIDGE_VERSION);
}

function showHelp() {
  console.log(`
  hbridge — Hermes Bridge

  COMMANDS:
    hbridge --enable         Start bridge with deterministic key
    hbridge --disable        Stop bridge
    hbridge --status         Show status + last client connection
    hbridge --help           Show this help

  Port and key are derived from the working directory.
  Home mode (HBRIDGE_HOME=1) skips auth; remote mode enforces key.

  EXAMPLES:
    hbridge --enable         Enable with dir-derived key
    hbridge --status         Show connected IP + last active time
  `);
  process.exit(0);
}

const args = process.argv.slice(2);
const cmd = args[0];

// Home mode: auto-start HTTP server, block --stdio (not needed)
if (isHome()) {
  cmd_enable();
} else if (cmd === "--enable") cmd_enable();
else if (cmd === "--disable") cmd_disable();
else if (cmd === "--status") cmd_status();
else if (cmd === "--stdio") { startMcpServer(); }
else if (cmd === "--help" || cmd === "-h") { showHelp(); }
else {
  console.log("hbridge — Hermes Bridge");
  console.log("  hbridge --enable           Start bridge");
  console.log("  hbridge --disable          Stop bridge");
  console.log("  hbridge --status           Show status");
  console.log("  hbridge --help             Show help");
}
