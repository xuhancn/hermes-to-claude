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

Parse the args to determine the subcommand. The args string contains space-separated tokens after `/h2c`. All commands run via direct Bash, **not** MCP tools.

### Subcommand mapping

| Input | Command | Notes |
|---|---|---|
| `enable` | `h2c enable` | Start server, show persistent machine key |
| `disable` | `h2c disable` | |
| `status` | `h2c status` | |
| `status_bar on` | See `/h2c help` | |
| `status_bar off` | See `/h2c help` | |
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
