#!/usr/bin/env node
import { createServer, startMcpServer, startStatusBar, stopStatusBar } from "./server.mjs";
import { markRunning, markStopped, readState } from "./state.mjs";
import { networkInterfaces } from "os";
import { isHome, homePort, homeKey } from "./home.mjs";
import { Bridge } from "./bridge.mjs";

const V = globalThis.HBRIDGE_VERSION || "v0.0.0-dev";
let server = null, statusBarInterval = null, bridge = null;

function ips() { return Object.values(networkInterfaces()).flat().filter(n => n.family === "IPv4" && !n.internal).map(n => n.address); }

async function cmd_enable() {
  const cwd = process.cwd(), port = homePort(cwd), key = homeKey(cwd), ip = isHome() ? "127.0.0.1" : (ips()[0] || "127.0.0.1");
  console.log("hbridge enabled\n" + cwd + "\n" + ip + ":" + port + " | " + key + " | " + V);
  bridge = new Bridge({ cwd }); server = createServer(key, bridge);
  server.listen(port, isHome() ? "127.0.0.1" : undefined); markRunning(port);
  statusBarInterval = startStatusBar(port); process.stdin.resume();
}
function cmd_disable() {
  if (server) { server.close(() => { server = null; markStopped(); stopStatusBar(statusBarInterval); process.exit(0); }); setTimeout(() => process.exit(0), 1000); }
  else { markStopped(); process.exit(0); }
}
function cmd_status() {
  const cwd = process.cwd(), port = homePort(cwd), key = homeKey(cwd), state = readState(), ip = isHome() ? "127.0.0.1" : (ips()[0] || "127.0.0.1");
  console.log((state.running ? "hbridge enabled" : "hbridge stopped") + "\n" + cwd + "\n" + ip + ":" + port + " | " + key + " | " + V);
}
function help() { console.log("\n  hbridge --enable/-disable/-status/--stdio/--help\n"); process.exit(0); }

const cmd = process.argv[2];
if (isHome() && (cmd === "--enable" || cmd === "--disable")) { console.log("Home mode active"); process.exit(0); }
if (cmd === "--enable") cmd_enable();
else if (cmd === "--disable") cmd_disable();
else if (cmd === "--status") cmd_status();
else if (cmd === "--stdio") startMcpServer();
else if (cmd === "--help" || cmd === "-h") help();
else if (isHome()) cmd_enable();
else console.log("hbridge --enable/--disable/--status/--stdio/--help");
