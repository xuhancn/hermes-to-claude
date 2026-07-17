---
name: hbridge
description: Control the Hermes Bridge (hbridge) server — enable, disable, status, user management
---

# /hbridge — Hermes Bridge Control

Usage:
```
/hbridge enable [user]       Start hbridge server, generate/show access key
/hbridge disable             Stop hbridge server
/hbridge status              Show server status + user list
/hbridge user add <name>     Add a new user + generate key
/hbridge user list           List all users with creation dates
/hbridge help                Show this help
```

## Instructions

Parse the args to determine the subcommand. The args string contains space-separated tokens after `/hbridge`.

### Subcommand mapping

| Input | MCP tool call | Notes |
|---|---|---|
| `enable [user]` | `hbridge_enable({user: user})` | Default user `"bridge"` if omitted |
| `disable` | `hbridge_disable()` | |
| `status` | `hbridge_status()` | |
| `user add <name>` | `hbridge_user_add({name: name})` | `name` is required |
| `user list` | `hbridge_user_list()` | |
| `help` or no args | Show help text | |

### Examples

- `/hbridge enable` → enable with default user "bridge"
- `/hbridge enable xu` → enable as user "xu"
- `/hbridge user add han` → add new user "han"
- `/hbridge user list` → list all users

### Edge cases

- **No args** → show help text
- **Unknown subcommand** → show error + help text
- **`enable` with no user** → use default "bridge" (not an error)
- **`user add` without name** → show error: missing required name
- **`user` without subcommand** → show error: expected `add` or `list`
- **If MCP tool errors** → display the error message to the user
