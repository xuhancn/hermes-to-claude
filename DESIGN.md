# H-Bridge (hbridge) Design

Hermes Bridge — local HTTP bridge from Hermes Agent to Claude Code.

## Architecture

```
npm install
  ├─ preinstall: build → dist/hbridge.mjs + dist/statusline.mjs
  ├─ install: npm deps
  └─ postinstall: register MCP + statusLine in ~/.claude configs

Claude Code
  └─ spawn node dist/hbridge.mjs --stdio (MCP child process)
       │
       ├─ MCP tools: enable / disable / status / user_add / user_list
       │
       └─ hbridge_enable → HTTP server on :9190
            ├─ GET  /health              → {"status":"ok"}
            ├─ POST /v1/task/create      → Bridge.createTask(prompt, taskId)
            │                              → stdin NDJSON → persistent Claude
            └─ GET  /v1/task/output?id=x → Bridge.getTaskOutput(id) from memory
```

## StatusLine

Claude Code polls ~3-5s:

```
▶️ hbridge: on | :9190 | 📨"fix bug"
⏹️ hbridge: off
```

Task info from `~/.hbridge_state.json.latestTask`, written by Bridge on each state change.

## Key Format

`hb_XXXX-XXXX` — 8 chars Base52 (A-Za-z), `crypto.randomBytes()`, ~45.6 bit entropy.

## Task Queuing

Tasks run sequentially (single Claude process). Queue is in-memory.
If a task is running, subsequent `createTask` calls wait via busy-poll.

Timeout: 5 minutes per task. On timeout, task is marked "failed" and queue advances.

## Files

### Runtime (gitignored)
| File | Purpose |
|------|---------|
| `~/.hbridge_state.json` | running/stopped flag + port + latestTask |

### Config (written by postinstall)
| File | Purpose |
|------|---------|
| `~/.claude.json` | MCP server entry (mcpServers.hbridge) |
| `~/.claude/settings.json` | StatusLine command (highest priority) |
