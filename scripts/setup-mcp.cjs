#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const os = require("os");

const CONFIG = path.join(process.env.HOME || os.homedir(), ".claude", "claude_desktop_config.json");
const HBRIDGE_ENTRY = {
  command: "hbridge",
  args: ["--stdio"],
};

try {
  fs.mkdirSync(path.dirname(CONFIG), { recursive: true });
  
  let config = {};
  if (fs.existsSync(CONFIG)) {
    config = JSON.parse(fs.readFileSync(CONFIG, "utf8"));
  }
  
  if (!config.mcpServers) config.mcpServers = {};
  if (!config.mcpServers.hbridge) {
    config.mcpServers.hbridge = HBRIDGE_ENTRY;
    fs.writeFileSync(CONFIG, JSON.stringify(config, null, 2));
    console.log("✓ hbridge registered in Claude Code MCP config");
  } else {
    console.log("✓ hbridge already registered");
  }
} catch (e) {
  console.error("⚠ Could not register hbridge in Claude Code MCP config:", e.message);
  console.error("  Add manually: /mcp add hbridge -- hbridge --stdio");
}
