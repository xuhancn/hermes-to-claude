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
       ├─ MCP tools: enable / disable / status
       │
       └─ hbridge_enable → HTTP server on homePort(cwd)
            ├─ GET  /health              → {"status":"ok"}
            ├─ POST /v1/task/create      → Bridge.createTask(prompt, taskId)
            │                              → stdin NDJSON → persistent Claude
            └─ GET  /v1/task/output?id=x → Bridge.getTaskOutput(id) from memory
```

## StatusLine

Claude Code polls ~3-5s:

```
▶️ hbridge: on | :XXXX | 📨"fix bug"
⏹️ hbridge: off
```

Task info from `~/.hbridge_state.json.latestTask`, written by Bridge on each state change.

## Key Format & Derivation

Key is `hb_` + base52(MD5(cwd)[4:10]) — deterministic per directory, no storage needed.

Both home and remote modes use the same derivation. The only difference:
- **Home mode** (HBRIDGE_HOME=1): no auth, localhost-only (`127.0.0.1`)
- **Remote mode**: auth enforced against the deterministic key

## Port Derivation

Port is `9200 + (MD5(cwd)[0:2] % 600)` — range [9200, 9799], stable per directory.

## Task Queuing

Tasks run sequentially (single Claude process). Queue is in-memory.
If a task is running, subsequent `createTask` calls wait via busy-poll.

Timeout: 5 minutes per task. On timeout, task is marked "failed" and queue advances.

## Files

### Runtime (gitignored)
| File | Purpose |
|------|---------|
| `~/.hbridge_state.json` | running/stopped flag + port + latestTask + lastClientIP |

### Config (written by postinstall)
| File | Purpose |
|------|---------|
| `~/.claude.json` | MCP server entry (mcpServers.hbridge) |
| `~/.claude/settings.json` | StatusLine command (highest priority) |
