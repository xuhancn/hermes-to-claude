# MCP Protocol Spec — hbridge Mapping

Spec: https://modelcontextprotocol.io/specification/2024-11-05

## 1. Lifecycle — Initialization

**Spec ref**: `Specification → Base Protocol → Lifecycle → Initialization`

**Sequence**:
```
Client → Server:  initialize  (protocolVersion + capabilities + clientInfo)
Server → Client:  initialize response (protocolVersion + capabilities + serverInfo)
Client → Server:  notifications/initialized  (no response needed)
```

**hbridge implementation**: `mcp.mjs` lines 79-88

## 2. Capabilities — tools MUST declare listChanged

**Spec ref**: `Specification → Server Features → Tools → Capabilities`

**Spec quote**: "Servers that support tools MUST declare the tools capability"
```
{"capabilities": {"tools": {"listChanged": true}}}
```

**hbridge implementation**: `mcp.mjs` line 85 — `capabilities: { tools: { listChanged: true } }`

## 3. Tool Definition Format

**Spec ref**: `Specification → Server Features → Tools → Data Types → Tool`

**Fields**:
- `name` (string, required) — unique tool name
- `description` (string, optional) — human-readable description
- `inputSchema` (object, required) — JSON Schema for tool parameters

**hbridge implementation**: `mcp.mjs` TOOLS array, lines 292-322 — all 4 tools have name + description + inputSchema

## 4. tools/list Response

**Spec ref**: `Specification → Server Features → Tools → Protocol Messages → Listing Tools`

**Response format**:
```
{"tools": [Tool, Tool, ...]}
```

**hbridge implementation**: `mcp.mjs` line 89 — respond({ result: { tools: TOOLS } })

## 5. tools/call Response

**Spec ref**: `Specification → Server Features → Tools → Data Types → Text Content`

**Format**:
```
{"content": [{"type": "text", "text": "result string"}]}
```

**hbridge implementation**: `mcp.mjs` lines 161-164 — respond({ result: { content: [{ type: "text", text: t }] } })

## 6. Available Tools

| Tool | Description |
|------|-------------|
| `hbridge_enable` | Start hbridge HTTP server, show access key |
| `hbridge_disable` | Stop hbridge server |
| `hbridge_status` | Show server status + last client connection info |
| `hbridge_status_bar` | Show/hide hbridge status in Claude Code status bar |

## 7. Additional Features

- **Stdout guard** (`mcp.mjs` lines 25-32): Non-JSON stdout writes are redirected to stderr to prevent third-party console.log from corrupting the MCP JSON-RPC stream.
- **Crash protection** (`mcp.mjs` lines 35-40): `uncaughtException` and `unhandledRejection` handlers keep the MCP process alive.
- **HTTP inbox server** (`mcp.mjs` lines 180-285): When `HBRIDGE_HOME=1`, the MCP server also auto-starts an HTTP server on the deterministic port.
- **Server info**: `serverInfo: { name: "hbridge", version: "1.0.0" }` in initialize response.

## 8. Validation Results

```
✅ initialize   → protocolVersion:2024-11-05, capabilities.listChanged:true
✅ tools/list   → 4 tools with name+description+inputSchema
✅ tools/call   → content[{type:text,text:...}]
✅ notified/init → silent accept
```
