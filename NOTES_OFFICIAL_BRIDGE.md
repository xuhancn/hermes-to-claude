# Official Bridge Spawn Mechanism

Source: `src/sessionRunner.ts` + `src/types.ts`

## Spawn Args

```
npx @anthropic-ai/claude-code
  --print
  --sdk-url <websocket_url>
  --session-id <session_id>
  --input-format stream-json
  --output-format stream-json
  --replay-user-messages
```

## Communication Protocol

Claude process stays alive persistently. Messages exchanged via NDJSON on stdin/stdout.

### Send to Claude (child.stdin.write)

```json
{"type":"user","message":{"content":"fix bug"},"parent_tool_use_id":null}
```

### Receive from Claude (child.stdout, NDJSON lines)

```json
{"type":"assistant","message":{"content":[{"type":"text","text":"..."},{"type":"tool_use","name":"Bash","input":{...}}]}}
{"type":"result","subtype":"success"}
{"type":"control_request","request_id":"...","request":{"subtype":"can_use_tool","tool_name":"Bash","input":{...}}}
```

### Message Types

| type | direction | meaning |
|------|-----------|---------|
| `user` | → stdin | User message / task prompt |
| `assistant` | ← stdout | Claude's response (text + tool_use blocks) |
| `result` | ← stdout | Turn complete (subtype: "success") |
| `control_request` | ← stdout | Permission request for tool use |

## Environment Variables

```
CLAUDE_CODE_SESSION_ACCESS_TOKEN=<token>
CLAUDE_CODE_ENVIRONMENT_KIND=bridge
CLAUDE_CODE_POST_FOR_SESSION_INGRESS_V2=1
```

## Key Difference vs Current hbridge

| | Official | Current hbridge |
|---|---|---|
| Process | **Single persistent** Claude | New `npx --print` per task |
| Communication | JSON-RPC via stdin/stdout | Pipe plain text to stdin |
| Input format | `stream-json` (NDJSON) | Raw text |
| Output format | `stream-json` (NDJSON) | Raw text |
| Session | Has `--session-id` | No session |
| Task dispatch | `child.stdin.write(msg)` | `child.stdin.write(prompt); child.stdin.end()` |
