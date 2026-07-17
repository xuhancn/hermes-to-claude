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

**hbridge implementation**: `mcp.mjs` lines 17-21

## 2. Capabilities — tools MUST declare listChanged

**Spec ref**: `Specification → Server Features → Tools → Capabilities`

**Spec quote**: "Servers that support tools MUST declare the tools capability"
```
{"capabilities": {"tools": {"listChanged": true}}}
```

**hbridge implementation**: `mcp.mjs` line 19 — `capabilities: { tools: { listChanged: true } }`

## 3. Tool Definition Format

**Spec ref**: `Specification → Server Features → Tools → Data Types → Tool`

**Fields**:
- `name` (string, required) — unique tool name
- `description` (string, optional) — human-readable description
- `inputSchema` (object, required) — JSON Schema for tool parameters

**hbridge implementation**: `mcp.mjs` TOOLS array, lines 33-38 — all 5 tools have name + description + inputSchema

## 4. tools/list Response

**Spec ref**: `Specification → Server Features → Tools → Protocol Messages → Listing Tools`

**Response format**:
```
{"tools": [Tool, Tool, ...]}
```

**hbridge implementation**: `mcp.mjs` line 24 — respond({ result: { tools: TOOLS } })

## 5. tools/call Response

**Spec ref**: `Specification → Server Features → Tools → Data Types → Text Content`

**Format**:
```
{"content": [{"type": "text", "text": "result string"}]}
```

**hbridge implementation**: `mcp.mjs` lines 27-31 — respond({ result: { content: [{ type: "text", text: t }] } })

## 6. Validation Results

```
✅ initialize   → protocolVersion:2024-11-05, capabilities.listChanged:true
✅ tools/list   → 5 tools with name+description+inputSchema
✅ tools/call   → content[{type:text,text:...}]
✅ notified/init → silent accept
```
