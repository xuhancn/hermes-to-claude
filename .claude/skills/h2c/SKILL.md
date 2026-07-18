---
name: h2c
description: Control the Hermes Bridge (h2c) server — enable, disable, status
---

# /h2c — Hermes Bridge Control

Usage:
```
/h2c enable               Start h2c server, show persistent machine key
/h2c disable              Stop h2c server
/h2c status               Show server status + last client connection info
/h2c status_bar on        Attach h2c status to Claude Code status bar
/h2c status_bar off       Remove h2c from status bar
/h2c help                 Show this help
```

## Instructions

Parse the args to determine the subcommand. The args string contains space-separated tokens after `/h2c`.

### Subcommand mapping

| Input | MCP tool call | Notes |
|---|---|---|
| `enable` | `h2c_enable()` | Key from `~/.h2c_key` (random, machine-global) |
| `disable` | `h2c_disable()` | |
| `status` | `h2c_status()` | |
| `status_bar on` | `h2c_status_bar({"action":"on"})` | Attach h2c to existing bar |
| `status_bar off` | `h2c_status_bar({"action":"off"})` | Restore user's original bar |
| `help` or no args | Show help text | |

Port and key are derived from the working directory. Home mode (H2C_HOME=1) skips auth.

### Examples

- `/h2c enable` → start server, show persistent machine key
- `/h2c status` → show status + last client connection info
- `/h2c status_bar on` → attach h2c to status bar

### Edge cases

- **No args** → show help text
- **Unknown subcommand** → show error + help text
- **If MCP tool errors** → display the error message to the user
