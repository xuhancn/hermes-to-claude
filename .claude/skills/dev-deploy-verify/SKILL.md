---
name: dev-deploy-verify
description: Verify that hbridge installs and runs correctly on the current platform. Use this skill whenever the user asks to verify deployment, test setup steps, record installation procedures, or validate cross-platform compatibility (Windows/Linux/macOS). Also use when the user finds issues during setup and needs root-cause analysis and fixes.
---

# Dev Deploy Verify

Verify hbridge from fresh clone to running service across Windows, Linux, macOS.

## Architecture (current)

```
npm install
  → preinstall: build → dist/hbridge.mjs + dist/statusline.mjs
  → postinstall: register MCP (~/.claude.json) + statusLine (~/.claude/settings.json)

Claude Code starts → spawns hbridge --stdio (MCP child process)
  → /mcp hbridge enable → HTTP server on :9190
  → Hermes POST /v1/task/create → persistent Claude --print process
     (JSON-RPC: stdin.write user message, stdout.read NDJSON result)
  → StatusLine: "hbridge: on | :9190" or "hbridge: off"
```

## Cross-platform notes

- Windows: `cmd.exe /d /s /c npx.cmd` for spawn
- Linux/macOS: `npx` directly
- MCP + HTTP in same process, no extra port config
- StatusLine auto-registered in postinstall

## Manual config

If postinstall skipped:
1. `npm run build`
2. `/mcp add hbridge -- node dist/hbridge.mjs --stdio`
3. Add to `~/.claude/settings.json`:
   `{"statusLine":{"type":"command","command":"node /path/to/dist/statusline.mjs"}}`
