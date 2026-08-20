# Spawn Mechanism — Per-Task Claude Code Processes

> Each task gets its own Claude Code child process, managed by the `Session` class. No more single persistent process.

## Spawn Command

```bash
npx @anthropic-ai/claude-code
  --print
  --input-format stream-json
  --output-format stream-json
  --verbose
```

When `skip_permissions: true` is set by Hermes, `--dangerously-skip-permissions` is appended.

No `--sdk-url` or `--session-id` in the `stream-json` spawn mode — those are for remote WebSocket transport.

### Cross-Platform

| Platform | Spawn Command | Status |
|----------|---------------|--------|
| Linux | `npx @anthropic-ai/claude-code --print --input-format stream-json --output-format stream-json --verbose` | ✅ |
| Windows | `cmd.exe /d /s /c npx.cmd ...` | ✅ |
| macOS | same as Linux | ✅ |

## Release Integrity — Detect → Self-Heal → Fallback

A broken Claude Code release (native binary shipped as a tiny placeholder stub) crashes
every spawn with `exit code 1`. Before spawning, `Session` consults
`claudeLauncher.mjs` (`ensureClaudeBinary`), which runs three layers:

1. **Detect** — `bin/claude[.exe]` in the npx cache
   (`~/.npm/_npx/<hash>/node_modules/@anthropic-ai/claude-code/`) is stat'd.
   A file `< 4KB` (or missing) is a placeholder. The verdict is cached ~30s.
2. **Self-heal** — re-runs `node install.cjs` in the package dir, with backoff
   retries (2s/4s). A 404/`ETARGET` aborts retrying immediately (the release is
   incomplete — retrying won't help); a network error retries.
3. **Fallback** — `npm view @anthropic-ai/claude-code versions --json` returns
   publish order (old → new). Candidates iterate **newest → oldest**, excluding
   the broken release: `versions[len - 2]` first — **never `slice(1)`** (that's
   the second *oldest*). Each candidate is installed to `~/.cache/hermes-to-claude/
   claude-code/<version>` and verified; the first complete one is locked and
   spawned directly (`node <pkg>/cli.js` for old packages, `<pkg>/bin/claude[.exe]`
   native for new ones). The lock is re-checked against the latest release every 6h.

Concurrency: heal/fallback runs under a process-internal mutex, so parallel tasks
that all observe the placeholder wait for one repair instead of racing.

Respecting user intent: when `H2C_CLAUDE_VERSION` is set, the flow installs/heals
that exact version but **never** falls back to a different version — a broken pin
surfaces a clear, actionable error instead of silently downgrading.

## stdin Message Format (NDJSON)

One line per message:

```json
{"type":"user","session_id":"","message":{"role":"user","content":"fix bug"},"parent_tool_use_id":null}
```

| Field | Value | Description |
|-------|-------|-------------|
| `type` | `"user"` | Message type (SDK protocol) |
| `session_id` | `""` | Empty for stdio (non-remote) mode |
| `message.role` | `"user"` | Sender role |
| `message.content` | free text | The prompt |
| `parent_tool_use_id` | `null` | No parent tool for top-level messages |

Control messages sent to stdin:

```json
{"type":"control_request","request_id":"cancel_xxx","request":{"subtype":"interrupt"}}
{"type":"control_response","response_id":"req_xxx","response":{"subtype":"success","response":{"behavior":"allow","updatedInput":{...}}}}
```

## stdout Response Format (NDJSON)

Claude API format (primary):

```json
{"role":"assistant","content":[{"type":"text","text":"Done."}]}
```

Legacy MCP format (also handled):

```json
{"type":"assistant","message":{"content":[{"type":"text","text":"Done."}]}}
```

Streaming events (progressive output):

```json
{"type":"stream_event","event":{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hello"}}}
```

Content parse order: `msg.content || msg.message?.content` (both formats).

## Permission Requests

When Claude needs to use a tool and permission mode is "approve":

```json
{"type":"control_request","request_id":"req_xxx","request":{"subtype":"can_use_tool","tool_name":"Bash","input":{"command":"git status"},"tool_use_id":"toolu_xxx"}}
```

The bridge forwards this as an SSE `permission_request` event and waits for Hermes to respond via `POST /v1/task/permission`.

## Completion Detection

Task is marked done when **any** of these appear in a stdout message:

- `msg.stop_reason` is set (Claude API turn complete)
- `msg.type === "result"` (MCP format)
- `msg.type === "session_state_changed"` with `msg.state === "idle"`

## Echo Deduplication

Each inbound message is checked against a `BoundedUUIDSet` (2000-entry ring buffer) to filter out echoed messages caused by the bidirectional transport.

## Multi-Turn Auto-Respond

When Claude sends a `user`-type message (asking for confirmation), the Session auto-responds with `"Continue. Do not ask for confirmation."` up to 5 times before stopping.
