# H-Bridge (hbridge) v1 Design

`hbridge` = Hermes Bridge — independent from Claude Code official `/bridge`.

## User Flow

```
$ npm install -g hbridge          ← Done. Everything else is in Claude Code.

$ claude
  ▸ /mcp add hbridge -- hbridge --stdio
  ✓ hbridge registered

  ▸ /mcp hbridge enable
  Username: xu
  ╔══════════════════════════════════╗
  ║  ⚠ H-Bridge enabled             ║
  ║  Remote access is now allowed    ║
  ║  User:   xu                      ║
  ║  Key:    hb_KxVq-RmZp           ║
  ║  Addr:   127.0.0.1:9190          ║
  ║         192.168.27.243:9190     ║
  ║  Save this key — shown once      ║
  ╚══════════════════════════════════╝

  ▸ /mcp hbridge status
  hbridge: on | port: 9190 | 0 tasks | ↑ 2min

  ▸ /mcp hbridge user add han
  ✓ User: han  Key: hb_YtBn-WcFl

  ▸ /mcp hbridge user list
  xu     active    Jul 16 14:22
  han    inactive  never

  ▸ /mcp hbridge disable
  ✓ hbridge disabled
```

## Architecture

```
Hermes ──HTTP──▶ hbridge:9190 ──stdio──▶ Claude Code
  (remote)        转发器            (spawns hbridge as MCP)
                      │
               Auth: hb_XxXx-XxXx
               Users: add/del/key/list
```

## Key Format

`hb_XXXX-XXXX` — 8 chars Base52 (A-Za-z), 45.6 bits.

## MCP Tools

```
/mcp hbridge enable       Start bridge + generate key
/mcp hbridge disable      Stop bridge
/mcp hbridge status       Show status bar
/mcp hbridge help         Show help

/mcp hbridge user add     Add user
/mcp hbridge user del     Delete user
/mcp hbridge user key     Regenerate key
/mcp hbridge user list    List all users
```

## Open Source

Target: MIT — when stable.
