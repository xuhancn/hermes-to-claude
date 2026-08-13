#!/usr/bin/env node
import { createServer, startStatusBar, stopStatusBar } from "./server.mjs";
import { markRunning, markStopped, readState } from "./state.mjs";
import { networkInterfaces } from "os";
import { isHome, homePort, homeKey } from "./home.mjs";
import { startStdinWatchdog } from "./orphan_watchdog.mjs";

const H2C_VERSION = globalThis.H2C_VERSION || "v0.0.0-dev";
let server = null;
let statusBarInterval = null;
let watchdog = null;
let shuttingDown = false;

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

  console.log("h2c enabled");
  console.log("📂 " + cwd);
  console.log("🔑 " + ip + ":" + port + " | " + key + " | " + H2C_VERSION);
  console.log("\n👉 Hermes-Agent → https://github.com/xuhancn/hermes-to-claude#3-for-hermes-agent");

  server = createServer(key);
  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      process.stderr.write(`Port ${port} already in use — h2c may already be running\n`);
    } else {
      process.stderr.write(`Server error: ${err.message}\n`);
    }
  });
  server.listen(port, isHome() ? "127.0.0.1" : undefined);
  markRunning(port);

  statusBarInterval = startStatusBar(port);
  process.stdin.resume();

  // Orphan watchdog — exit when the launching Claude Code's pipe closes
  // (stdin 'end'), so we don't keep holding the port. Disable with
  // H2C_NO_AUTO_EXIT=1.
  watchdog = startStdinWatchdog({ onExit: shutdownForOrphan });
}

// Released the port + state when the launching pipe closed (stdin 'end').
function shutdownForOrphan(reason) {
  if (shuttingDown) return;
  shuttingDown = true;
  if (watchdog) watchdog.stop();
  stopStatusBar(statusBarInterval);
  process.stderr.write(`[h2c] launcher gone (${reason}) — shutting down\n`);
  if (server) {
    server.close(() => {
      markStopped();
      process.exit(0);
    });
    // Fallback: if close hangs, force exit after 1s
    setTimeout(() => {
      markStopped();
      process.exit(0);
    }, 1000);
  } else {
    markStopped();
    process.exit(0);
  }
}

function cmd_disable() {
  if (watchdog) watchdog.stop();
  if (server) {
    server.close(() => {
      server = null;
      markStopped();
      console.log("  h2c: off");
      stopStatusBar(statusBarInterval);
      process.exit(0);
    });
    // Fallback: if close hangs, force exit after 1s
    setTimeout(() => process.exit(0), 1000);
  } else {
    markStopped();
    console.log("  h2c: off");
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

  console.log(running ? "h2c enabled" : "h2c stopped");
  console.log("📂 " + cwd);
  console.log("🔑 " + ip + ":" + port + " | " + key + " | " + H2C_VERSION);
  console.log("\n👉 Hermes-Agent → https://github.com/xuhancn/hermes-to-claude#3-for-hermes-agent");
}

function showHelp() {
  console.log(`
  h2c — Hermes Bridge

  COMMANDS:
    h2c enable          Start bridge with deterministic key
    h2c disable         Stop bridge
    h2c status          Show status + last client connection
    h2c help            Show this help

  Port is derived from the working directory; key is machine-global from ~/.h2c_key.
  Home mode (H2C_HOME=1) skips auth; remote mode enforces key.

  EXAMPLES:
    h2c enable          Enable with dir-derived key
    h2c status          Show connected IP + last active time
  `);
  process.exit(0);
}

const args = process.argv.slice(2);
const cmd = args[0];

// Home mode: auto-start HTTP server directly
if (isHome()) {
  cmd_enable();
} else if (cmd === "enable") cmd_enable();
else if (cmd === "disable") cmd_disable();
else if (cmd === "status") cmd_status();
else if (cmd === "help" || cmd === "-h") { showHelp(); }
else {
  console.log("h2c — Hermes Bridge");
  console.log("  h2c enable            Start bridge");
  console.log("  h2c disable           Stop bridge");
  console.log("  h2c status            Show status");
  console.log("  h2c help              Show help");
}
