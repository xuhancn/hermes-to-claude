# MCP Protocol Spec — hbridge 对照

Spec: https://modelcontextprotocol.io/specification/2024-11-05

## 1. Lifecycle — 初始化阶段

**文档位置**: `Specification → Base Protocol → Lifecycle → Initialization`

**流程**:
```
Client → Server:  initialize  (protocolVersion + capabilities + clientInfo)
Server → Client:  initialize response (protocolVersion + capabilities + serverInfo)
Client → Server:  notifications/initialized  (no response needed)
```

**hbridge 实现**: `mcp.mjs` line 17-21

## 2. Capabilities — tools 必须声明 listChanged

**文档位置**: `Specification → Server Features → Tools → Capabilities`

**原文**: "Servers that support tools MUST declare the tools capability"
```
{"capabilities": {"tools": {"listChanged": true}}}
```

**hbridge 实现**: `mcp.mjs` line 19 — `capabilities: { tools: { listChanged: true } }`

## 3. Tool 定义格式

**文档位置**: `Specification → Server Features → Tools → Data Types → Tool`

**字段**:
- `name` (string, required) — unique tool name
- `description` (string, optional) — human-readable description
- `inputSchema` (object, required) — JSON Schema for tool parameters

**hbridge 实现**: `mcp.mjs` TOOLS array, line 33-38 — all 5 tools have name + description + inputSchema

## 4. tools/list 响应

**文档位置**: `Specification → Server Features → Tools → Protocol Messages → Listing Tools`

**响应格式**:
```
{"tools": [Tool, Tool, ...]}
```

**hbridge 实现**: `mcp.mjs` line 24 — respond({ result: { tools: TOOLS } })

## 5. tools/call 响应

**文档位置**: `Specification → Server Features → Tools → Data Types → Text Content`

**格式**:
```
{"content": [{"type": "text", "text": "result string"}]}
```

**hbridge 实现**: `mcp.mjs` line 27-31 — respond({ result: { content: [{ type: "text", text: t }] } })

## 6. 验证结果

```
✅ initialize   → protocolVersion:2024-11-05, capabilities.listChanged:true
✅ tools/list   → 5 tools with name+description+inputSchema
✅ tools/call   → content[{type:text,text:...}]
✅ notified/init → silent accept
```
