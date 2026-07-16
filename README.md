# Hermes-Claude-Bridge

> Forked from [soyou19/Open-ClaudeCode](https://github.com/soyou19/Open-ClaudeCode) — bridge transport layer extracted as standalone project, auth code removed, all dependencies inlined into `claude-code-deps/`.

Local HTTP bridge connecting Hermes Agent to Claude Code — no Pro/Max subscription required.

## Why hbridge

- **Leverages Claude Code built-in security** — Auto Mode protects your filesystem
- **Simpler than SSH** — no key pairs, no authorized_keys
- **Zero external API** — local-only, no subscription
- **Independent auth** — hb_ keys, not OS accounts
- **Default-off** — no attack surface when disabled

### Architecture

```
Hermes Agent                    hbridge                     Claude Code CLI
       │                            │                              │
       │──── HTTP ────────────────▶│                              │
       │      Auth: hb_XxXx-XxXx   │                              │
       │                            │──── spawn ─────────────────▶│
       │                            │                              │
       │      TaskCreate ──────────▶│──── prompt ────────────────▶│
       │◀──── TaskOutput ──────────│◀─── result ─────────────────│
```

hbridge runs as a local HTTP server. Hermes connects via HTTP, hbridge spawns Claude Code.

## Commands

```
hbridge --enable [-u user]    Start bridge + generate key
hbridge --disable             Stop bridge
hbridge --status              Show detailed status
hbridge --help                Show this help

hbridge --user add [name]     Add user
hbridge --user del <name>     Delete user
hbridge --user key <name>     Regenerate key
hbridge --user list           List all users
```

### Remote Mode (HTTP + SSH Tunnel)

Bridge runs as HTTP service on one machine, Hermes connects via SSH tunnel from another：

```
┌─── Hermes Host (Mac/Linux) ────────────┐
│                                     │
│  Hermes Agent ──HTTP──▶ Bridge Server (HTTP :9190)
│       ▲                            │
│       │                            │ SSH tunnel
│   Telegram Gateway                     │
└───────┼────────────────────────────┼───┘
        │                            │
   Mobile                   ┌──────▼──────────┐
                             │ Claude Host      │
                             │ (Windows/Linux)          │
                             └───────────────────┘
```

On the Mac:
```bash
node src/hbridge/cli.mjs --enable
```
On the remote machine:
```bash
ssh -L 9190:localhost:9190 mac-mini
```
Point Hermes config to localhost:9190.

## Dependencies

- **Node.js ≥ 20**(22 LTS recommended)
- **Claude Code CLI**(npx @anthropic-ai/claude-code, cc-switch compatible)
- **Hermes Agent** any version

## Build (All Platforms)

TypeScript project, builds to a single executable:

```bash
git clone https://github.com/xuhancn/hermes-claude-bridge.git
cd hermes-claude-bridge
npm install
npm run build          # → dist/bridge.mjs
```

## Install

### Linux

```bash
# 1. Install Node.js
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# 2. Clone + build
git clone <repo> && cd hermes-claude-bridge
npm install && npm run build

# 3. Verify
node src/hbridge/cli.mjs --help
```

### macOS

```bash
brew install node@22
git clone <repo> && cd hermes-claude-bridge
npm install && npm run build
node src/hbridge/cli.mjs --help
```

### Windows

```powershell
winget install OpenJS.NodeJS.LTS
git clone <repo> ; cd hermes-claude-bridge
npm install ; npm run build
node src/hbridge/cli.mjs --help
```

## Usage

```bash
# Start bridge
node src/hbridge/cli.mjs --enable xu

# Add another user
node src/hbridge/cli.mjs --user add han

# Stop bridge
node src/hbridge/cli.mjs --disable
```

Hermes connects via HTTP to `localhost:9190` with the generated key.

## Protocol

JSON-RPC 2.0 over HTTP:

```json
{"jsonrpc":"2.0","method":"task/create","params":{"prompt":"..."},"id":1}
{"jsonrpc":"2.0","result":{"sessionId":"cse_xxx"},"id":1}
```

## Tests

```
node tests/test_users.mjs     307/307
node tests/test_cli.mjs       8/8
node tests/test_server.mjs    3/3
node tests/test_bridge.mjs    6/6
node tests/test_http.mjs      4/4
Total: 327 tests
```

## License

MIT
