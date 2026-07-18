# H-Bridge (h2c) Design

Hermes Bridge — local HTTP bridge from Hermes Agent to Claude Code.

## Architecture

```
npm install
  ├─ preinstall: build → dist/h2c.mjs + dist/statusline.mjs
  ├─ install: npm deps
  └─ postinstall: register statusLine + skill in ~/.claude configs

/h2c enable
  └─ HTTP server on homePort(cwd)
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

Modes (set per-task at creation):
| `permission_mode` | Behavior |
|---|---|
| `"approve"` (default) | Hermes must approve each tool call |
| `"bypass"` | Session auto-approves all tool calls |
| `skip_permissions: true` | `--dangerously-skip-permissions` flag, Claude never asks |

## API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/health` | GET | No | Health check |
| `/v1/task/create` | POST | Yes | Create a task + optional `permission_mode` + `skip_permissions` |
| `/v1/task/cancel` | POST | Yes | Cancel a running or queued task |
| `/v1/task/permission` | POST | Yes | `{"task_id","behavior","updatedInput?","message?"}` |
| `/v1/task/output?task_id=x` | GET | Yes | Get task result (memory → disk fallback) |
| `/v1/task/output/stream?task_id=x` | GET | Yes | SSE streaming (chunk, permission_request, done, error) |
| `/v1/task?task_id=x` | GET | Yes | Get task status only |

### SSE Streaming Events

Connect to `/v1/task/output/stream?task_id=xxx`:

```
data: {"type":"connected","taskId":"task_xxx"}
data: {"type":"chunk","text":"Fixing bug..."}
data: {"type":"permission_request","task_id":"t1","tool_name":"Bash","input":{"command":"git status"}}
data: {"type":"done","exitCode":0}
```

### Task Lifecycle Diagram

```
Hermes                          h2c:<port>                    Session (Claude Code)
  │                                │                                │
  │  POST /v1/task/create          │                                │
  │  {"prompt":"fix bug"}          │                                │
  │──────────────────────────────▶│                                │
  │  {"task_id":"task_xxx",       │  spawn Claude Code              │
  │   "status":"created"}         │  stdin (NDJSON):                │
  │◀──────────────────────────────│  {"type":"user",               │
  │  (immediate, no wait)         │   "message":{"role":"user",    │
  │                                │    "content":"fix bug"},       │
  │                                │──────────────────────────────▶│
  │                                │                                │  execute
  │                                │  stdout (NDJSON):              │
  │                                │  stream_event (progressive)    │
  │                                │  SSE: chunk events             │
  │                                │  result / stop_reason          │
  │                                │◀──────────────────────────────│
  │                                │  task persisted to disk        │
  │                                │                                │
  │  GET /v1/task/output?          │                                │
  │    task_id=task_xxx            │                                │
  │──────────────────────────────▶│                                │
  │  {"retrieval_status":"success",│                                │
  │   "task":{"status":"done",    │                                │
  │    "result":"Fixed...",       │                                │
  │    "exitCode":0,              │                                │
  │    "usage":{...}}}            │                                │
  │◀──────────────────────────────│                                │
```

## Task Result Format

```json
{
  "retrieval_status": "success" | "pending",
  "task": {
    "id": "task_xxx",
    "status": "done" | "failed" | "running",
    "result": "Hello.",
    "exitCode": 0,
    "usage": {
      "total_cost_usd": 0.01234,
      "input_tokens": 150,
      "output_tokens": 300,
      "cache_creation_input_tokens": 10,
      "cache_read_input_tokens": 20
    }
  }
}
```

## Design Rationale: Key vs Port

**Key is machine-global**, **port is per-directory**. This follows Claude Code's working-directory-centric model.

Claude Code reads its context — `CLAUDE.md`, project skills, `.claude/settings.json` — from the **current working directory**. Each project has its own conventions, its own skills, its own CLAUDE.md. To serve the right context, h2c must spawn Claude Code in the right directory.

```
/project-a/CLAUDE.md  →  h2c :9200  →  Claude Code (cwd=/project-a)
/project-b/CLAUDE.md  →  h2c :9201  →  Claude Code (cwd=/project-b)
```

**Port per directory** (`9200 + MD5(cwd) % 600`) means:
- Each project gets a stable, predictable port
- You can run h2c for multiple projects on the same machine without conflict
- The port is deterministic — Hermes computes it from the directory path without asking the server

**Key per machine** means:
- Hermes only needs one credential per machine, not one per project
- The key is random, generated once, persisted in `~/.h2c_key`
- Same auth works across all directories on the same host

Key format: `hb_` + 8 base52 chars (≈ 45 bits entropy, `crypto.randomBytes(8)`, stored once).

## Key & Port Derivation

- **Port**: `9200 + (MD5(cwd)[0:2] % 600)` — range [9200, 9799], stable per directory
- **Key**: `hb_` + 8 random base52 characters — generated once, stored in `~/.h2c_key`. Same for all directories on one machine.

## Task Persistence

Completed tasks are saved to `~/.h2c_tasks.jsonl` (JSONL, append-only, max 2000 entries). On server restart, tasks are loaded into memory. `getTaskOutput` checks session → memory cache → disk.

## Files

### Runtime (gitignored)
| File | Purpose |
|------|---------|
| `~/.h2c_state.json` | running/stopped flag + port + lastClientIP/lastActiveAt |
| `~/.h2c_tasks.jsonl` | Completed task records (JSONL, survive restart) |

### Config (written by postinstall)
| File | Purpose |
|------|---------|
| `~/.claude/settings.json` | StatusLine command (highest priority) |

## StatusLine

Claude Code polls ~3-5s:

```
▶️ h2c: on | :<port>
⏹️ h2c: off
```

Liveness is determined by polling `127.0.0.1:<port>/health` — no state-file dependency.

## Changelog

### #51 — Multi-session + persistence
- **Sequential queue busy-polls** ✅ Fixed
  - Old: `createTask` polled `setInterval` until previous task finished
  - New: Session pool with promise queue — no busy-polling
- **Task timeout kills queue** ✅ Fixed (see #52)
- **Persistence**: Completed tasks saved to `~/.h2c_tasks.jsonl`, survive restart
- **Session class**: One Claude Code child process per task
- **Parallelism**: Up to 3 concurrent tasks (configurable via `maxConcurrent`)

### #52 — Remove hard 5-min timeout
- `TASK_TIMEOUT_MS` default changed from 300_000 to 0 (no timeout)
- Timeout is now opt-in: pass `taskTimeoutMs` to Bridge/Session constructor

### #53 — Home mode direct enable
- Home mode (`H2C_HOME=1`) now calls `cmd_enable()` directly
- No longer goes through `--stdio` MCP layer
- `--stdio` removed — h2c is HTTP-only

### #54+ — Permission pipeline
- `--dangerously-skip-permissions` replaced by Hermes-controlled permission pipeline
- Default mode `"approve"`: every tool call waits for Hermes decision
- `POST /v1/task/permission` for allow/deny/modify
- SSE `permission_request` events for real-time Hermes notification
- Task-level `permission_mode` and `skip_permissions` overrides
