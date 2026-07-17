# Spawn Mechanism — Persistent Claude Code Process

> Sources: Adapted from `NOTES_OFFICIAL_BRIDGE.md`, `DESIGN.md`, and upstream
> `src/sessionRunner.ts` + `src/types.ts` (official Anthropic bridge).

## Spawn Command

```bash
npx @anthropic-ai/claude-code
  --print
  --input-format stream-json
  --output-format stream-json
  --verbose              ← required for stream-json output
```

`--verbose` is required for `stream-json` output to function correctly.

No `--sdk-url` or `--session-id` in local mode — those are for remote WebSocket transport.

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
| `session_id` | `""` | Empty for local mode |
| `message.role` | `"user"` | Sender role |
| `message.content` | free text | The prompt |
| `parent_tool_use_id` | `null` | No parent tool for top-level messages |

## stdout Response Format (NDJSON)

Claude API format (primary):

```json
{"role":"assistant","content":[{"type":"text","text":"Done."}]}
```

Legacy MCP format (also handled):

```json
{"type":"assistant","message":{"content":[{"type":"text","text":"Done."}]}}
```

Content parse order: `msg.content || msg.message?.content` (both formats).

## Completion Detection

Task is marked done when **any** of these appear in a stdout message:

- `msg.stop_reason` is set (Claude API turn complete)
- `msg.type === "result"` (MCP format)
- `msg.subtype === "success"` (MCP result format)

## Key Differences Applied (PR #14)

| Item | Before PR #14 | After PR #14 |
|------|---------------|--------------|
| `--verbose` | Missing | Added (required) |
| stdin format | `{type:"user", message:{content:"..."}}` | `{type:"user", session_id:"", message:{role:"user", content:"..."}, parent_tool_use_id:null}` |
| Content parse | `msg.message?.content` only | `msg.content \|\| msg.message?.content` (both formats) |
| Completion | `msg.type==="result" && subtype==="success"` | `stop_reason \|\| type==="result" \|\| subtype==="success"` |
