# Official Bridge Spawn Mechanism (applied in PR #14)

Source: `src/sessionRunner.ts` + `src/types.ts` → adapted for hbridge.

## Spawn Args

```
npx @anthropic-ai/claude-code
  --print
  --input-format stream-json
  --output-format stream-json
  --verbose              ← required for stream-json output
```

(No `--sdk-url` or `--session-id` in local mode — those are for remote WebSocket transport.)

## stdin Message Format (NDJSON)

```json
{"type":"user","session_id":"","message":{"role":"user","content":"fix bug"},"parent_tool_use_id":null}
```

Key fields:
- `type`: must be `"user"` (SDK protocol)
- `session_id`: empty string for local
- `message.role`: `"user"`
- `message.content`: free text prompt
- `parent_tool_use_id`: `null` for top-level messages

## stdout Response Format (NDJSON)

Claude API format:
```json
{"role":"assistant","content":[{"type":"text","text":"Done."}]}
```

Legacy MCP format (also handled):
```json
{"type":"assistant","message":{"content":[{"type":"text","text":"Done."}]}}
```

## Completion Detection

Task is done when ANY of:
- `msg.stop_reason` is set (Claude API turn complete)
- `msg.type === "result"` (MCP)
- `msg.subtype === "success"` (MCP result)

## Key Differences Applied

| Item | Before PR #14 | After PR #14 |
|------|--------------|-------------|
| `--verbose` | Missing | Added (required) |
| stdin format | `{type:"user", message:{content:"..."}}` | `{type:"user", session_id:"", message:{role:"user", content:"..."}, parent_tool_use_id:null}` |
| Content parse | `msg.message?.content` only | `msg.content \|\| msg.message?.content` (both formats) |
| Completion | `msg.type==="result" && subtype==="success"` | `stop_reason \|\| type==="result" \|\| subtype==="success"` |
