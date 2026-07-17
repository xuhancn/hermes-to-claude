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

  // ---- statusLine hook (user ~/.claude/settings.json — higher priority) ----
  const STATUSBAR_PATH = path.join(__dirname, "..", "dist", "statusline.mjs");
  const cmd = `node ${STATUSBAR_PATH}`;

  let settings = {};
  if (fs.existsSync(USER_SETTINGS)) {
    settings = JSON.parse(fs.readFileSync(USER_SETTINGS, "utf8"));
  }

  settings.statusLine = settings.statusLine || {};
  // Only overwrite if the current command is NOT already our statusline
  // (preserves user-customized statusLine that happens to be the same)
  if (settings.statusLine.command !== cmd) {
    settings.statusLine.command = cmd;
  }

  fs.mkdirSync(path.dirname(USER_SETTINGS), { recursive: true });
  fs.writeFileSync(USER_SETTINGS, JSON.stringify(settings, null, 2));
  console.log("✓ hbridge statusLine registered");

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
