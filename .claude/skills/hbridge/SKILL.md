---
name: hbridge
description: Control the Hermes Bridge (hbridge) server — enable, disable, status
---

# /hbridge — Hermes Bridge Control

Usage:
```
/hbridge enable               Start hbridge server, show persistent machine key
/hbridge disable              Stop hbridge server
/hbridge status               Show server status + last client connection info
/hbridge status_bar on        Attach hbridge status to Claude Code status bar
/hbridge status_bar off       Remove hbridge from status bar
/hbridge help                 Show this help
```

## Instructions

Parse the args to determine the subcommand. The args string contains space-separated tokens after `/hbridge`.

### Subcommand mapping

| Input | MCP tool call | Notes |
|---|---|---|
| `enable` | `hbridge_enable()` | Key from `~/.hbridge_key` (random, machine-global) |
| `disable` | `hbridge_disable()` | |
| `status` | `hbridge_status()` | |
| `status_bar on` | `hbridge_status_bar({"action":"on"})` | Attach hbridge to existing bar |
| `status_bar off` | `hbridge_status_bar({"action":"off"})` | Restore user's original bar |
| `help` or no args | Show help text | |

Port and key are derived from the working directory. Home mode (HBRIDGE_HOME=1) skips auth.

### Examples

- `/hbridge enable` → start server, show deterministic access key
- `/hbridge status` → show status + last client connection info
- `/hbridge status_bar on` → attach hbridge to status bar

### Edge cases

- **No args** → show help text
- **Unknown subcommand** → show error + help text
- **If MCP tool errors** → display the error message to the user
