---
name: dev-deploy-verify
description: Verify that h2c installs and runs correctly on the current platform. Use this skill whenever the user asks to verify deployment, test setup steps, record installation procedures, or validate cross-platform compatibility (Windows/Linux/macOS). Also use when the user finds issues during setup and needs root-cause analysis and fixes.
---

# Dev Deploy Verify

Verify h2c from fresh clone to running service across Windows, Linux, macOS.

## Architecture (current)

```
npm install
  → prepare: build → dist/h2c.mjs + dist/statusline.mjs
  → postinstall: register MCP (~/.claude.json) + statusLine (~/.claude/settings.json)

Claude Code starts → spawns h2c --stdio (MCP child process)
  → /mcp h2c enable → HTTP server on :9190
  → Hermes POST /v1/task/create
      → Bridge spawns persistent Claude:
          npx @anthropic-ai/claude-code --print --input-format stream-json --output-format stream-json --verbose
      → Send via stdin (NDJSON):
          {"type":"user","session_id":"","message":{"role":"user","content":"fix bug"},"parent_tool_use_id":null}
      → Claude responds on stdout:
          {"role":"assistant","content":[{"type":"text","text":"Done."}]}
          (completion: stop_reason || type=="result" || subtype=="success")
      → StatusLine: "▶️ h2c: on | :9190 | 📨\"fix bug\""
```

## Cross-platform notes

- Windows: `cmd.exe /d /s /c npx.cmd` for spawn
- Linux/macOS: `npx` directly
- `--verbose` flag required for `stream-json` output to work
- MCP + HTTP in same process, no extra port config
- StatusLine auto-registered in postinstall

## Manual config

If postinstall skipped:
1. `npm run build`
2. `/mcp add h2c -- node dist/h2c.mjs --stdio`
3. Add to `~/.claude/settings.json`:
   `{"statusLine":{"type":"command","command":"node /path/to/dist/statusline.mjs"}}`
