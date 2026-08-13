#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const os = require("os");

const USER_SETTINGS = path.join(
  process.env.HOME || os.homedir(),
  ".claude",
  "settings.json",
);
const USER_SKILL_DIR = path.join(
  process.env.HOME || os.homedir(),
  ".claude",
  "skills",
  "h2c",
);

try {
  // ---- statusLine hook (default ON — attaches to user's existing bar) ----
  const STATUSBAR_PATH = path.join(__dirname, "..", "dist", "statusline.mjs").replace(/\\/g, "/");
  const cmd = `node "${STATUSBAR_PATH}"`;
  const USER_CMD_FILE = path.join(os.homedir(), ".h2c_user_statusline_cmd");
  const USER_STATUSLINE_FILE = path.join(os.homedir(), ".h2c_user_statusline.json");

  let settings = {};
  if (fs.existsSync(USER_SETTINGS)) {
    settings = JSON.parse(fs.readFileSync(USER_SETTINGS, "utf8"));
  }

  // Save existing user's FULL statusLine object so it can be restored later
  if (settings.statusLine?.command && settings.statusLine.command !== cmd) {
    fs.mkdirSync(path.dirname(USER_CMD_FILE), { recursive: true });
    fs.writeFileSync(USER_STATUSLINE_FILE, JSON.stringify(settings.statusLine || {}, null, 2), "utf8");
    fs.writeFileSync(USER_CMD_FILE, settings.statusLine.command, "utf8");
  }
  // Preserve existing fields (padding/refreshInterval/etc.), only change type+command
  settings.statusLine = {
    ...(settings.statusLine || {}),
    type: "command",
    command: cmd,
  };

  fs.mkdirSync(path.dirname(USER_SETTINGS), { recursive: true });
  fs.writeFileSync(USER_SETTINGS, JSON.stringify(settings, null, 2));
  console.log("✓ h2c statusLine registered (attaches to existing bar)");

  // ---- /h2c slash command skill (global ~/.claude/skills/h2c/) ----
  const SKILL_SRC = path.join(__dirname, "..", ".claude", "skills", "h2c", "SKILL.md");
  const SKILL_DST = path.join(USER_SKILL_DIR, "SKILL.md");

  if (fs.existsSync(SKILL_SRC)) {
    fs.mkdirSync(USER_SKILL_DIR, { recursive: true });
    fs.copyFileSync(SKILL_SRC, SKILL_DST);
    console.log("✓ h2c slash command installed (/h2c)");
  } else {
    console.warn("⚠ h2c skill file not found — skipping slash command install");
  }
} catch (e) {
  console.error("⚠ Could not register h2c in Claude Code config:", e.message);
}
