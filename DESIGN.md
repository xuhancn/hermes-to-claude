# H-Bridge (hbridge) Design

Hermes Bridge — local HTTP bridge from Hermes Agent to Claude Code.

## Architecture

```
npm install
  ├─ preinstall:  build → dist/hbridge.mjs + dist/statusline.mjs
  ├─ install:     npm deps
  └─ postinstall: register MCP + statusLine in ~/.claude configs

Claude Code
  └─ spawn node dist/hbridge.mjs --stdio (MCP child process)
       │
       ├─ MCP tools: enable / disable / status / user_add / user_list
       │
       └─ hbridge_enable → HTTP server on :9190
            ├─ GET  /health              → {"status":"ok"}
            ├─ POST /v1/task/create      → Bridge.createTask(prompt)
            │                              → stdin JSON-RPC → persistent Claude
            └─ GET  /v1/task/output?id=x → Bridge.getTaskOutput(id)
```

## Persistent Claude Process

```
Bridge.createTask("fix bug")
  → child.stdin.write(JSON.stringify({
      type: "user",
      message: { content: "fix bug" }
    }) + "\n")

  ← child.stdout.readline() → JSON.parse → {
      type: "assistant",
      message: { content: [{ type: "text", text: "Done." }] }
    }

  ← child.stdout.readline() → {
      type: "result",
      subtype: "success"
    }
```

Process is spawned once with `--print --input-format stream-json --output-format stream-json`.
Tasks queue sequentially (no parallelism). Process stays alive indefinitely.

## StatusLine

Claude Code polls ~3-5s:

```
hbridge: on | :9190     (service running)
hbridge: off             (service stopped)
```

## HTTP API

All endpoints except `/health` require Basic Auth (`user:hb_XXXX-XXXX`).

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | `{"status":"ok"}` |
| `/v1/task/create` | POST | Create task → spawn Claude via JSON-RPC |
| `/v1/task/output?task_id=x` | GET | Task result from memory |

## Key Format

`hb_XXXX-XXXX` — 8 chars Base52 (A-Za-z), `crypto.randomBytes()`, ~45.6 bit entropy.

## Cross-Platform

| Platform | Spawn | Status |
|----------|-------|--------|
| Linux | `npx @anthropic-ai/claude-code --print --input-format stream-json` | ✅ |
| Windows | `cmd.exe /d /s /c npx.cmd ...` | ✅ |
| macOS | same as Linux | ✅ |

## Files

### Runtime (gitignored)
| File | Purpose |
|------|---------|
| `~/.hbridge_state.json` | running/stopped flag + port |

### Config (written by postinstall)
| File | Purpose |
|------|---------|
| `~/.claude.json` | MCP server entry |
| `~/.claude/settings.json` | StatusLine command |
