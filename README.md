# Hermes-Claude-Bridge (hbridge)

> Forked from [soyou19/Open-ClaudeCode](https://github.com/soyou19/Open-ClaudeCode) — bridge transport layer extracted as standalone project, auth code removed, all dependencies inlined into `claude-code-deps/`.

**hbridge** connects Hermes Agent to Claude Code via local HTTP — no Pro/Max, no SSH certs, no system user management.

## Why hbridge

| Approach | Security | Setup | Relies on |
|----------|----------|-------|-----------|
| SSH + raw commands | Agent has full shell access | Complex (keys, users) | System auth |
| Claude /bridge | Claude permission model | Pro/Max required | Anthropic API |
| **hbridge** | Claude Auto Mode + hb_ key | 1 command: --enable | Node.js only |

- **Leverages Claude Code built-in security** — Auto Mode protects your filesystem
- **Simpler than SSH** — no key pairs, no authorized_keys
- **Zero external API** — local-only, no subscription
- **Independent auth** — hb_ keys, not OS accounts
- **Default-off** — no attack surface when disabled

## Quick Start

```bash
git clone https://github.com/xuhancn/hermes-claude-bridge.git
cd hermes-claude-bridge
npm install && npm run build
node src/hbridge/cli.mjs --enable
```

See [DESIGN.md](DESIGN.md) for full architecture.

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

## Hermes Config

```
hermes mcp add hbridge -- node dist/hbridge.mjs --enable xu
```

## Tests

```
node tests/test_users.mjs     307/307
node tests/test_cli.mjs       8/8
node tests/test_server.mjs    3/3
node tests/test_bridge.mjs    6/6
node tests/test_http.mjs      4/4
Total: 328 tests
```
