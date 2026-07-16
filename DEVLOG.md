# hbridge Development Log

## 2026-07-16 — MCP fully working with DeepSeek cc-switch

### Issues Found
1. hbridge_enable generates key even when user exists
2. hbridge_user_add does not check existing user

### Resolved
- MCP stdio protocol: initialize, tools/list, tools/call
- Claude discovers hbridge as MCP server (5 tools)
- cc-switch + DeepSeek supports tool_use
- Linux MCP config: ~/.claude.json
- build: dist/hbridge.mjs
- Key reuse on CLI --enable
- 327 UT passing
