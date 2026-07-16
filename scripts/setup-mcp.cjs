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
  fs.writeFileSync(CONFIG, JSON.stringify(config, null, 2));
  // Also add statusline
  config.statusLine = { type: "command", command: path.join(__dirname, "..", "dist", "statusline.mjs") };
  fs.writeFileSync(CONFIG, JSON.stringify(config, null, 2));
  console.log("✓ hbridge MCP + statusLine config updated");
} catch (e) {
  console.error("⚠ Could not register hbridge in Claude Code MCP config:", e.message);
  console.error("  Add manually: /mcp add hbridge -- hbridge --stdio");
}
