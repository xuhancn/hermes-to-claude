#!/usr/bin/env node
import { startMcpServer } from "./mcp.mjs";
import { createServer, startStatusBar, stopStatusBar } from "./server.mjs";
import { markRunning, markStopped, readState } from "./state.mjs";
import { COLORS, log } from "./utils.mjs";
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

  if (isHome()) {
    console.log(`\n  ╔════════════════════════════════════════════╗
  ║  hbridge home mode    ${HBRIDGE_VERSION.padEnd(19)}  ║
  ║  Addr:  127.0.0.1:${String(port).padEnd(5)}${' '.repeat(20)}║
  ║  Key:   ${key.padEnd(36)}║
  ╚════════════════════════════════════════════╝
`);
  } else {
    console.log(`
  ╔════════════════════════════════════════════╗
  ║  ${COLORS.yellow}⚠ H-Bridge enabled${COLORS.reset}   ${HBRIDGE_VERSION.padEnd(19)}  ║
  ║  Remote access is now allowed             ║
  ║                                            ║
  ║  Key:    ${key.padEnd(35)}║
  ║  Addr:   127.0.0.1:${String(port).padEnd(5)}${' '.repeat(19)}║`);
    for (const ip of ips) {
      console.log(`  ║         ${(ip + ":" + port).padEnd(35)}║`);
    }
    console.log(`  ║                                            ║
  ║  Save this key — shown once                ║
  ╚════════════════════════════════════════════╝
`);
  }

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
  const port = homePort(process.cwd());
  const key = homeKey(process.cwd());
  const ips = getLocalIPs();
  const state = readState();

  console.log(`
  ══════════════════════════
  hbridge ${HBRIDGE_VERSION}
  Status:    ${server ? "enabled" : "disabled"}
  Port:      ${port}
  Key:       ${key}`);
  if (ips.length > 0) {
    console.log(`  LAN:       ${ips.map(ip => ip + ":" + port).join(", ")}`);
  }
  if (state.lastClientIP) {
    console.log(`  Last conn: ${state.lastClientIP} at ${new Date(state.lastActiveAt).toLocaleString()}`);
  }
  console.log(`  ══════════════════════════
`);
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

// Home mode: block manual enable/disable
if (isHome() && (cmd === "--enable" || cmd === "--disable")) {
  console.log("Home mode active — manual control disabled");
  process.exit(0);
}

if (cmd === "--enable") cmd_enable();
else if (cmd === "--disable") cmd_disable();
else if (cmd === "--status") cmd_status();
else if (cmd === "--stdio") { startMcpServer(); }
else if (cmd === "--help" || cmd === "-h") { showHelp(); }
else if (isHome()) { cmd_enable(); }
else {
  console.log("hbridge — Hermes Bridge");
  console.log("  hbridge --enable           Start bridge");
  console.log("  hbridge --disable          Stop bridge");
  console.log("  hbridge --status           Show status");
  console.log("  hbridge --help             Show help");
}
