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
       ├─ MCP tools: enable / disable / status / status_bar
       │
       └─ hbridge_enable → HTTP server on homePort(cwd)
            ├─ GET  /health                   → {"status":"ok"}
            ├─ POST /v1/task/create            → Bridge.createTask(prompt)
            │                                    → new Session → spawn Claude
            ├─ POST /v1/task/cancel             → Session.cancel()
            ├─ POST /v1/task/permission         → Session.respondPermission()
            ├─ GET  /v1/task/output?task_id=x   → Bridge.getTaskOutput(id)
            ├─ GET  /v1/task?task_id=x          → Bridge.getTask(id)
            └─ GET  /v1/task/output/stream?id=x → SSE streaming
```

## Session Pool

Each task gets its own `Session` (one Claude Code child process). Sessions run in parallel up to `maxConcurrent` (default 3). If at capacity, tasks are queued in `_pendingQueue` and start when a slot opens.

```
Bridge.createTask(prompt)
  ├─ _sessions.size < maxConcurrent
  │   └─ new Session → spawn Claude → send prompt → onComplete → persist
  └─ _sessions.size >= maxConcurrent
      └─ _pendingQueue.push → _dequeueNext() when slot opens
```

## Session Lifecycle

```
Session.start()
  ├─ spawn npx @anthropic-ai/claude-code --print ...
  ├─ StdioTransport (stdin/stdout NDJSON)
  ├─ send prompt (type: "user")
  ├─ _onMessage() handles all NDJSON message types
  │   ├─ stream_event → progressive text accumulation
  │   ├─ assistant → content block parsing (text/tool_use/tool_result)
  │   ├─ control_request/can_use_tool → permission pipeline
  │   ├─ tool_progress → SSE forwarding
  │   ├─ user → multi-turn auto-respond
  │   └─ stop_reason / result → _finishTask() → persist + cleanup
  └─ _cleanup() → kill child, close transport
```

## Permission Pipeline

By default, when Claude wants to use a tool (Bash, Read, Write...), it sends a `can_use_tool` control_request. The Session blocks and emits an SSE `permission_request` event. Hermes must respond via `POST /v1/task/permission`.

```
Claude → {"type":"control_request","request":{"subtype":"can_use_tool","tool_name":"Bash",...}}
  → Session._onMessage
    → if permissionMode == "bypass": auto-allow (no SSE event)
    → if permissionMode == "approve": block + emit permission_request SSE
      → Hermes sees SSE → POST /v1/task/permission
        → Session.respondPermission("allow"|"deny")
          → control_response → Claude proceeds or stops
```

Modes:
- **approve** (default): Hermes must approve each tool call
- **bypass**: Session auto-approves all tool calls
- **skip_permissions=true**: `--dangerously-skip-permissions` flag, Claude never asks

## StatusLine

Claude Code polls ~3-5s:

```
▶️ hbridge: on | :<port>
⏹️ hbridge: off
```

Liveness is determined by polling `127.0.0.1:<port>/health` — no state-file dependency.

## Key Format & Derivation

Key is `hb_` + 8 random base52 characters — generated once, stored in `~/.hbridge_key`.
Same key for all directories on one machine. No per-directory derivation.

Both home and remote modes use the same machine-global key (`~/.hbridge_key`). The differences:
- **Home mode** (HBRIDGE_HOME=1): no auth, `127.0.0.1` only
- **Remote mode**: auth enforced against the stored key, listens on all interfaces

## Port Derivation

Port is `9200 + (MD5(cwd)[0:2] % 600)` — range [9200, 9799], stable per directory.

## Task Persistence

Completed tasks are saved to `~/.hbridge_tasks.jsonl` (JSONL, append-only, max 2000 entries). On server restart, tasks are loaded into memory. `getTaskOutput` checks session → memory cache → disk.

## Files

### Runtime (gitignored)
| File | Purpose |
|------|---------|
| `~/.hbridge_state.json` | running/stopped flag + port + lastClientIP/lastActiveAt |
| `~/.hbridge_tasks.jsonl` | Completed task records (JSONL, survive restart) |
| `~/.hbridge_inbox.json` | Task inbox (last 20 entries) |
| `~/.hbridge_chat.log` | Human-readable chat log (tail -f friendly) |
| `~/.hbridge_transcript.jsonl` | Raw NDJSON transcript (disabled per-session) |

### Config (written by postinstall)
| File | Purpose |
|------|---------|
| `~/.claude.json` | MCP server entry (mcpServers.hbridge) |
| `~/.claude/settings.json` | StatusLine command (highest priority) |
