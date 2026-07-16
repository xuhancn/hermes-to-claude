---
name: dev-deploy-verify
description: Verify that hbridge installs and runs correctly on the current platform. Use this skill whenever the user asks to verify deployment, test setup steps, record installation procedures, or validate cross-platform compatibility (Windows/Linux/macOS). Also use when the user finds issues during setup and needs root-cause analysis and fixes.
---

# Dev Deploy Verify

Verify hbridge from fresh clone to running HTTP + MCP service across Windows, Linux, macOS.

## Architecture (current)

```
npm install
  → preinstall: npm run build → dist/hbridge.mjs + dist/statusline.mjs
  → postinstall: scripts/setup-mcp.cjs
      → ~/.claude.json:  mcpServers.hbridge (5 MCP tools)
      → ~/.claude/settings.json:  statusLine.command (bottom bar)

Claude Code 启动时:
  → spawn node dist/hbridge.mjs --stdio (MCP 子进程)
  → hbridge_enable → HTTP server on :9190 (同进程内)
      → POST /v1/task/create → bridge._spawn() → stdin → Claude --print
      → 结果写入 ~/.hbridge_inbox.json
      → statusLine ~3s 刷新: hbridge: on | :9190 | ✅"task" | ✅"task2" | +N more
      → ~/.hbridge_chat.log 实时日志 (tail -f)
```

## Cross-platform notes

- Windows: `where` for command lookup, `cmd.exe /d /s /c` for npx.cmd spawn
- Linux/macOS: `which` for command lookup, direct npx spawn
- MCP + HTTP 同进程，不需要额外端口配置
- StatusLine 自动注册，不需要手动 setup

## Manual configuration path

When postinstall fails or `--ignore-scripts` was used:
1. Build: `npm run build`
2. Register MCP: `/mcp add hbridge -- node dist/hbridge.mjs --stdio`
3. StatusLine may not auto-register. Add to `~/.claude/settings.json`:
   ```json
   {"statusLine": {"type": "command", "command": "node /path/to/dist/statusline.mjs"}}
   ```
