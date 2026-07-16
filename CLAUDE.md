# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install          # Install dependencies
npm run build        # Build → dist/bridge.mjs (runs build.mjs → esbuild)
npm start            # node src/bridge.js (minimal JS entry point)
npm test             # Placeholder (echo 'ok')
node dist/bridge.mjs --help  # Show help
node dist/bridge.mjs --http  # Run in HTTP mode
```

## Architecture

### What this is

A fork of [Open-ClaudeCode](https://github.com/soyou19/Open-ClaudeCode) that extracts the bridge transport layer into a standalone project. It provides a local JSON-RPC bridge between **Hermes Agent** (an autonomous AI agent framework) and the **Claude Code CLI** — no Anthropic Pro/Max subscription required.

### Two modes

- **Local (stdio):** Hermes Agent spawns `dist/bridge.mjs` as a child process; they communicate via JSON-RPC 2.0 over stdin/stdout. Used via Hermes MCP config.
- **Remote (HTTP + SSH tunnel):** The bridge runs as an HTTP service on port 9090. A remote Hermes Agent connects via SSH tunnel (`ssh -L 9090:localhost:9090`).

### High-level structure

```
/
├── src/                    # Bridge source code
│   ├── bridgeMain.ts       # Main entry — 3000+ lines, two entry points:
│   │                       #   bridgeMain()  — interactive (TUI, stdin keys, readline dialogs)
│   │                       #   runBridgeHeadless() — daemon worker for supervisor mode
│   ├── bridgeApi.ts        # Standalone API client — stubs out real HTTP, returns dummy data
│   ├── bridgeConfig.ts     # Standalone config (env var BRIDGE_BASE_URL, no OAuth)
│   ├── bridge.js           # Minimal JS version (~70 lines), entry point for "npm start"
│   ├── types.ts            # All core interfaces: BridgeConfig, SessionHandle, BridgeApiClient, etc.
│   ├── sessionRunner.ts    # Spawns Claude Code child processes with SDK URLs + env vars
│   ├── createSession.ts    # Creates sessions on the server via API
│   ├── replBridge.ts       # REPL-integrated bridge (runs inside interactive Claude Code sessions)
│   ├── bridgeMessaging.ts  # Message parsing/routing between bridge and child processes
│   ├── bridgeUI.ts         # TUI status display (Ink/React terminal UI)
│   ├── bridgePointer.ts    # Crash-recovery pointer (write/read bridge-pointer.json)
│   ├── workSecret.ts       # Decode/encode JWT work secrets
│   ├── jwtUtils.ts         # Token refresh scheduling
│   ├── capacityWake.ts     # Signal primitive to wake at-capacity sleep loop
│   ├── pollConfig.ts       # Poll interval config from GrowthBook
│   ├── pollConfigDefaults.ts
│   ├── sessionIdCompat.ts  # session_* vs cse_* ID conversion
│   └── remoteBridgeCore.ts # Remote bridge core logic
├── claude-code-deps/       # Inlined dependencies from original Claude Code project
│   ├── cli/transports/     # Transport layers: HybridTransport, SSETransport, CCRClient
│   ├── services/           # Analytics, API, OAuth, policy limits
│   ├── types/              # Hooks, IDs, messages, permissions
│   └── utils/              # Config, auth, crypto, git, environment, logging, permissions, settings
├── build.mjs               # esbuild bundler with custom import resolution plugin
├── dist/                   # Build output
│   └── bridge.mjs          # Single-file executable
└── original-claude-code/   # Removed submodule (was git submodule, essential files in claude-code-deps/)
```

### Build system

`build.mjs` uses esbuild with a custom `resolve-bridge-deps` plugin that:
1. Maps `../` imports from `src/` to `claude-code-deps/` or the (removed) submodule
2. Maps `src/`-prefixed imports to `claude-code-deps/`
3. Hands `../../` imports from deps back to the submodule paths
4. Leaves Node built-ins and npm packages as externals
5. Produces a single ESM bundle at `dist/bridge.mjs`

### Session lifecycle

1. Bridge registers an "environment" with the backend (or produces a stub in standalone mode)
2. Poll loop fetches work items (JSON-RPC calls in standalone mode)
3. For `session` work type: spawns a Claude Code child process via `sessionRunner.ts`
4. Child process receives SDK URL + access token, connects back to the session ingress
5. `onSessionDone` callback cleans up: stops work, removes worktrees, archives sessions
6. Three spawn modes: `single-session`, `same-dir` (persistent, shared cwd), `worktree` (isolated git worktrees)

### Key env vars

| Variable | Purpose |
|---|---|
| `BRIDGE_BASE_URL` | API base URL (default `http://localhost:9090`) |
| `CLAUDE_PROJECT_ROOT` | Project root directory for task execution |
| `CLAUDE_CODE_SESSION_ACCESS_TOKEN` | Passed to child processes for session auth |
| `CLAUDE_CODE_ENVIRONMENT_KIND` | Set to `bridge` for bridge-spawned children |

### JSON-RPC protocol

```json
{"jsonrpc":"2.0","method":"task/create","params":{"prompt":"..."},"id":1}
{"jsonrpc":"2.0","result":{"sessionId":"cse_xxx"},"id":1}
```
