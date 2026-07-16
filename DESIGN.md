# H-Bridge (hbridge) Design

`hbridge` = Hermes Bridge — local HTTP bridge connecting Hermes Agent to Claude Code.

## Architecture (current)

```
npm install
  ├─ preinstall:  npm run build  → dist/hbridge.mjs + dist/statusline.mjs
  ├─ install:     npm deps
  └─ postinstall: scripts/setup-mcp.cjs
       ├─ ~/.claude.json:         mcpServers.hbridge → --stdio MCP
       └─ ~/.claude/settings.json: statusLine.command → dist/statusline.mjs

Claude Code 启动
  └─ spawn node dist/hbridge.mjs --stdio (MCP 子进程)
       │
       ├─ MCP 工具 (5):
       │   hbridge_enable / disable / status / user_add / user_list
       │
       └─ hbridge_enable → HTTP server on :9190 (同进程)
            ├─ GET  /health              → {"status":"ok"}
            ├─ POST /v1/task/create      → spawn Claude --print via stdin
            ├─ GET  /v1/task/output?id=x → ~/.hbridge_inbox.json result
            └─ GET  /v1/task?id=x        → task status only

Hermes ──HTTP──▶ :9190 ──▶ bridge._spawn() ──stdin──▶ Claude --print
                              │                            │
                              ▼                            ▼
                        ~/.hbridge_inbox.json        stdout captured
                        statusLine 更新              写入 inbox
                        ~/.hbridge_chat.log
```

## StatusLine (bottom bar)

Claude Code 原生轮询，~3-5s 刷新一次。

```
Enabled:  hbridge: on | :9190 | ✅"echo hello" | ✅"fix bug" | 📨"long" | +2 more
Disabled: hbridge: off
```

Format A: 最新 3 条任务（名称截 20 字）+ 超出计数。

## Key Format

`hb_XXXX-XXXX` — 8 chars Base52 (A-Za-z), `crypto.randomBytes()`, ~45.6 bit entropy.
Stored in `hbridge_users.json` (alongside the bridge).

## Data Flow

```
Hermes POST /v1/task/create {"prompt":"fix bug"}
  → HTTP server (mcp.mjs, port 9190)
  → bridge.createTask()
  → _spawn(id, prompt)
      → inbox: {id, prompt, status:"running"}
      → chatLog: ▶ Hermes → Claude: "fix bug"
      → spawn(npx, ["@anthropic-ai/claude-code", "--print"])
      → child.stdin.write(prompt) + child.stdin.end()
      → child.stdout → output captured
      → close → inbox: {status:"done", result:"...", exitCode:0}
      → chatLog: ✅ Claude → Hermes: exit:0 "..."
      → statusLine ~3s: ✅"fix bug"

Hermes GET /v1/task/output?task_id=xxx
  → return {retrieval_status:"success", task:{result, exitCode}}
```

## Files

### Runtime state (gitignored, ~/ 跨 CWD 安全)
| File | Purpose |
|------|---------|
| `~/.hbridge_state.json` | Server running/stopped + port + users + task count |
| `~/.hbridge_inbox.json` | Task list (max 20) with status, result, exitCode |
| `~/.hbridge_chat.log` | Human-readable conversation log (tail -f) |
| `~/.hbridge_liveness.json` | Liveness failure counter (3-failure debounce) |

### Config (written by postinstall)
| File | Purpose |
|------|---------|
| `~/.claude.json` | MCP server entry (mcpServers.hbridge) |
| `~/.claude/settings.json` | StatusLine command (highest priority) |

## Cross-Platform

| Platform | Spawn | Status |
|----------|-------|--------|
| Linux | `npx @anthropic-ai/claude-code --print` | ✅ |
| Windows | `cmd.exe /d /s /c npx.cmd ... --print` | ✅ |
| macOS | `npx @anthropic-ai/claude-code --print` | ✅ (same as Linux) |

## Open Source

MIT — when stable.
