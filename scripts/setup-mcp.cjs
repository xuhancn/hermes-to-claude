#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const os = require("os");

const CONFIG = path.join(process.env.HOME || os.homedir(), ".claude.json");
const USER_SETTINGS = path.join(
  process.env.HOME || os.homedir(),
  ".claude",
  "settings.json",
);
const USER_SKILL_DIR = path.join(
  process.env.HOME || os.homedir(),
  ".claude",
  "skills",
  "hbridge",
);
const HBRIDGE_ENTRY = {
  command: path.join(__dirname, "..", "dist", "hbridge.mjs"),
  args: ["--stdio"],
};

try {
  // ---- MCP server config (global ~/.claude.json) ----
  fs.mkdirSync(path.dirname(CONFIG), { recursive: true });

  let config = {};
  if (fs.existsSync(CONFIG)) {
    config = JSON.parse(fs.readFileSync(CONFIG, "utf8"));
  }

  if (!config.mcpServers) config.mcpServers = {};
  config.mcpServers.hbridge = HBRIDGE_ENTRY;

  fs.writeFileSync(CONFIG, JSON.stringify(config, null, 2));
  console.log("✓ hbridge MCP config updated");

  // ---- /hbridge slash command skill (global ~/.claude/skills/hbridge/) ----
  const SKILL_SRC = path.join(__dirname, "..", ".claude", "skills", "hbridge", "SKILL.md");
  const SKILL_DST = path.join(USER_SKILL_DIR, "SKILL.md");

  if (fs.existsSync(SKILL_SRC)) {
    fs.mkdirSync(USER_SKILL_DIR, { recursive: true });
    fs.copyFileSync(SKILL_SRC, SKILL_DST);
    console.log("✓ hbridge slash command installed (/hbridge)");
  } else {
    console.warn("⚠ hbridge skill file not found — skipping slash command install");
  }
} catch (e) {
  console.error("⚠ Could not register hbridge in Claude Code config:", e.message);
  console.error("  Add manually: /mcp add hbridge -- hbridge --stdio");
}
