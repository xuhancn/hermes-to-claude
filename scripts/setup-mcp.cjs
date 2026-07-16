#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const os = require("os");

const CONFIG = path.join(process.env.HOME || os.homedir(), ".claude.json");
const HBRIDGE_ENTRY = {
  command: path.join(__dirname, "..", "dist", "hbridge.mjs"),
  args: ["--stdio"],
};

try {
  fs.mkdirSync(path.dirname(CONFIG), { recursive: true });
  
  let config = {};
  if (fs.existsSync(CONFIG)) {
    config = JSON.parse(fs.readFileSync(CONFIG, "utf8"));
  }
  
  if (!config.mcpServers) config.mcpServers = {};
  config.mcpServers.hbridge = HBRIDGE_ENTRY;

  // Register statusLine hook so Claude shows hbridge state in the bottom bar
  const STATUSBAR_PATH = path.join(__dirname, "..", "dist", "statusline.mjs");
  if (!config.statusLine) config.statusLine = {};
  config.statusLine.command = `node ${STATUSBAR_PATH}`;

  fs.writeFileSync(CONFIG, JSON.stringify(config, null, 2));
  console.log("✓ hbridge MCP config updated");
  console.log("✓ hbridge statusLine registered");
} catch (e) {
  console.error("⚠ Could not register hbridge in Claude Code MCP config:", e.message);
  console.error("  Add manually: /mcp add hbridge -- hbridge --stdio");
}
