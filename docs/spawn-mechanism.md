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
