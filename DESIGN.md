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

## Persistent Claude Process

### Spawn

```
npx @anthropic-ai/claude-code --print --input-format stream-json --output-format stream-json --verbose
```

`--verbose` is required for `stream-json` output to function correctly.

### stdin Message (NDJSON, one line per message)

```json
{"type":"user","session_id":"","message":{"role":"user","content":"fix bug"},"parent_tool_use_id":null}
```

Fields:
- `type`: `"user"` — message type (SDK protocol)
- `session_id`: `""` — empty for local mode
- `message.role`: `"user"` — sender role
- `message.content`: the prompt text
- `parent_tool_use_id`: `null` — no parent tool for top-level messages

### stdout Response (NDJSON)

```json
{"role":"assistant","content":[{"type":"text","text":"Done."}]}
```

Content format accepts both:
- `role:"assistant"`, `content:[{type:"text",text:"..."}]` (Claude API format)
- `type:"assistant"`, `message:{content:[{type:"text",text:"..."}]}` (MCP format)

### Completion Detection

Task is marked done when ANY of these appear in a stdout message:
- `msg.stop_reason` is set (Claude API format)
- `msg.type === "result"` (MCP format)
- `msg.subtype === "success"` (MCP result format)

## StatusLine

Claude Code polls ~3-5s:

```
▶️ hbridge: on | :9190 | 📨"fix bug"
⏹️ hbridge: off
```

Task info from `~/.hbridge_state.json.latestTask`, written by Bridge on each state change.

## HTTP API

All endpoints except `/health` require Basic Auth (`user:hb_XXXX-XXXX`).

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | `{"status":"ok"}` |
| `/v1/task/create` | POST | Create task → spawn Claude via stdin NDJSON |
| `/v1/task/output?task_id=x` | GET | Task result from memory |

`POST /v1/task/create` returns immediately (fire-and-forget). Task runs in background.
Poll `GET /v1/task/output?task_id=x` until `retrieval_status: "success"`.

## Key Format

`hb_XXXX-XXXX` — 8 chars Base52 (A-Za-z), `crypto.randomBytes()`, ~45.6 bit entropy.

## Task Queuing

Tasks run sequentially (single Claude process). Queue is in-memory.
If a task is running, subsequent `createTask` calls wait via busy-poll.

Timeout: 5 minutes per task. On timeout, task is marked "failed" and queue advances.

## Cross-Platform

| Platform | Spawn | Status |
|----------|-------|--------|
| Linux | `npx @anthropic-ai/claude-code --print --input-format stream-json --output-format stream-json --verbose` | ✅ |
| Windows | `cmd.exe /d /s /c npx.cmd ...` | ✅ |
| macOS | same as Linux | ✅ |

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
