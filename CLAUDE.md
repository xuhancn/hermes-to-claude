# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Workflow Rules

- **PRs only** — branch → PR → review → merge. Never push directly to `main`.
- **Every PR needs a description** — what changed, why, how verified.
- **Build + test must pass** before commit/merge.
- **No node_modules/ or build artifacts** in commits.
- **Incremental changes only** — no revert-then-rewrite. If broken, roll back to the last known-good version and re-apply correct parts as deltas.

## Build

```bash
npm install        # install deps + postinstall auto-registers hbridge MCP
npm run build      # esbuild → dist/bridge.mjs + dist/hbridge.mjs
```

Output: two bundles in `dist/`:
- `hbridge.mjs` — the actively developed HTTP→MCP bridge
- `bridge.mjs` — legacy fork of Open-ClaudeCode bridge (not actively changed)

## Test

Tests use **no framework** — plain `node test_*.mjs` with inline assert/pass/fail counters:

```bash
# Single test file
node tests/test_users.mjs          # 307 tests — UserManager key gen/verify
node tests/test_bridge.mjs         # 6 tests — task create/get/output
node tests/test_cli.mjs            # 8 tests — CLI arg parsing
node tests/test_http.mjs           # 4 tests — HTTP API
node tests/test_server.mjs         # 3 tests — server health/auth
node tests/test_setup_mcp.mjs      # MCP config installation

# All tests
for f in tests/test_*.mjs; do node "$f"; done
```

Test convention: every file has `let pass=0, fail=0; assert(cond, msg)` and exits 1 on failure.

## Big-Picture Architecture

### Two codebases, one repo

The repo houses two independent bridges — the **actively developed hbridge** and a **legacy TypeScript bridge** (forked from Open-ClaudeCode) that is no longer being changed. New work always goes into `src/hbridge/`.

### hbridge module graph

```
CLI layer:      cli.mjs ─── parses --enable/--disable/--status/--user
                   │
        ┌──────────┼──────────────┐
        ▼          ▼              ▼
     mcp.mjs    server.mjs    users.mjs
     (stdio     (HTTP:9190)   (hb_ key
      MCP)                     storage)
        │          │
        └──────────┤
                   ▼
              bridge.mjs
         (spawns Claude Code child
          processes per task)
```

- **`cli.mjs`** — Entry point. Parses `--enable`, `--disable`, `--status`, `--user`, `--stdio`. Dispatches to the appropriate subsystem.
- **`mcp.mjs`** — MCP protocol (2024-11-05) server over stdio. Exposes 5 tools (`hbridge_enable`, `hbridge_disable`, `hbridge_status`, `hbridge_user_add`, `hbridge_user_list`). Claude Code auto-discovers this.
- **`server.mjs`** — HTTP REST server on port 9190. Routes: `/health`, `/v1/task/create`, `/v1/task/output`, `/v1/task`. Auth via HTTP Basic + `hb_XXXX-XXXX` key.
- **`bridge.mjs`** — Task execution engine. `createTask(prompt)` spawns `npx @anthropic-ai/claude-code -p <prompt>`, captures output, persists to disk.
- **`users.mjs`** — User/key store. CRUD on `hbridge_users.json`. Keys: `hb_XXXX-XXXX` format, 8 chars Base52 (45.6 bits entropy).

### Data flow

```
Hermes Agent (remote)       hbridge:9190              Claude Code (local)
     │                          │                          │
     │  POST /v1/task/create    │                          │
     │  Authorization: Basic    │                          │
     │─────────────────────────▶│                          │
     │                          │  spawn("npx", [          │
     │                          │    "@anthropic-ai/       │
     │                          │     claude-code",        │
     │                          │    "-p", prompt])        │
     │                          │─────────────────────────▶│
     │                          │                          │  execute task
     │                          │     stdout collected     │
     │                          │◀─────────────────────────│
     │  {"task_id":"task_..."}  │                          │
     │◀─────────────────────────│                          │
     │                          │                          │
     │  GET /v1/task/output     │                          │
     │  ?task_id=task_xxx       │                          │
     │─────────────────────────▶│                          │
     │  {"retrieval_status":    │                          │
     │   "success","task":...}  │                          │
     │◀─────────────────────────│                          │
```

### MCP protocol compliance

hbridge implements the [MCP 2024-11-05 spec](https://modelcontextprotocol.io/specification/2024-11-05):
- **initialize** — protocolVersion `"2024-11-05"`, capabilities `{tools: {listChanged: true}}`
- **tools/list** — returns 5 tools with name + description + inputSchema (JSON Schema)
- **tools/call** — returns `{content: [{type: "text", text: "..."}]}`
- **notifications/initialized** — silent accept

### Runtime state files (all gitignored)

| File | Purpose |
|------|---------|
| `hbridge_users.json` | User database (username → `{key, created}`) |
| `hbridge_tasks/` | Task output history (`task_<timestamp>.txt`) |

### Legacy bridge (`src/`, `claude-code-deps/`)

The TypeScript bridge (`src/bridgeMain.ts` → `dist/bridge.mjs`) is a fork of [Open-ClaudeCode](https://github.com/soyou19/Open-ClaudeCode). It originally provided a JSON-RPC bridge between Hermes Agent and Claude Code using a polling pattern (register environment → poll for work → spawn sessions → heartbeat). It includes multi-session support, git worktree isolation, and token refresh scheduling. Not actively developed — `dist/bridge.mjs` still works via `node dist/bridge.mjs --http :9090`.
