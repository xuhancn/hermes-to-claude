# Hermes-Claude-Bridge (hbridge)

Local HTTP bridge connecting **Hermes Agent** to **Claude Code** via a persistent JSON-RPC process — **no Pro/Max subscription required**.

```
Hermes ──HTTP──▶ hbridge:9190 ──stdio──▶ Claude Code (persistent --print --verbose)
  (remote)                  (NDJSON)      stdin: {"type":"user","session_id":"","message":{"role":"user","content":"fix bug"},"parent_tool_use_id":null}
                                          stdout: {"role":"assistant","content":[{"type":"text","text":"Done."}]}
```

**Use cases:**

- **Remote control**: Send tasks from your phone via Hermes — hbridge forwards to Claude Code running on your machine. Fix bugs, review code, run commands without sitting at your desk.
- **Dev assistant**: Hermes handles lightweight tasks; when it hits a codebase-specific problem, it delegates to Claude Code via hbridge. Claude reads the project, edits files, runs tests, and reports back.
- **Centralized hub**: Hermes becomes your single entry point — it routes tasks to the right tool (Claude Code, web search, etc.) and aggregates results. hbridge is the Claude Code plugin in this ecosystem.

## Advanced of hbridge

- **Security**: Hermes never touches your filesystem — all file ops go through Claude Code's Auto Mode permission system. No blind access.
- **Auth**: One-time `--enable` generates `hb_XXXX-XXXX` key (Base52, ~45.6-bit entropy). No SSH, no OAuth.
- **Local-only**: Fully offline. No cloud, no external API, no Anthropic subscription.
- **Default-off**: Zero ports open until explicit `--enable`. No attack surface when disabled.
- **Cross-platform**: Windows (cmd.exe), Linux, macOS — single codebase, tested on all three.

## 1. Design Framework

```
Phone / MCP Client  ──▶  Hermes Agent  ──HTTP──▶  hbridge :9190  ──stdio──▶  Claude Code (persistent)
                      (task orchestration)       │                              │
                                                  │  mcp.mjs (HTTP + MCP)       │  reads CLAUDE.md
                                                  │  bridge.mjs (process mgr)   │  loads skills
                                                  │  state.mjs (state file)     │  edits files
                                                  └─────────────────────────────┘
```

Hermes orchestrates tasks. hbridge translates HTTP requests into NDJSON messages for a single persistent Claude Code process. Claude executes — reads CLAUDE.md, loads skills, edits files — and streams results back. Hermes never touches your filesystem directly; all file operations go through Claude Code's permission system.

**Detail references:**
- [Spawn protocol](docs/spawn-mechanism.md) — Claude spawn command, NDJSON message format, completion detection
- [MCP spec mapping](docs/mcp-spec.md) — MCP lifecycle, tool definitions, response formats
- [Home local mode](docs/local-mode.md) — zero-config auto-start mode (experimental)
- [Module design](DESIGN.md) — key format, task queuing, state files

## 2. How to Build from Source

### Prerequisites

Install **Node.js 22+** :

| Platform | Command |
|----------|---------|
| Linux (Ubuntu/Debian) | `curl -fsSL https://deb.nodesource.com/setup_22.x \| sudo -E bash - && sudo apt install -y nodejs` |
| macOS | `brew install node@22` |
| Windows | `winget install OpenJS.NodeJS.LTS` |

Verify: `node --version` → `v22.x.x`

### Install & Build

```bash
git clone https://github.com/xuhancn/hermes-claude-bridge.git
cd hermes-claude-bridge
npm install                    # build + MCP auto-register in postinstall
npm install -g .               # optional: global hbridge command
```

`npm install` runs `build.mjs` (via preinstall) to produce `dist/hbridge.mjs` + `dist/statusline.mjs`, then registers the MCP server and statusLine in your `~/.claude` configs (via postinstall).

### Commands

| Command | Description |
|---------|-------------|
| `hbridge --enable <user>` | Start HTTP server on :9190, generate access key |
| `hbridge --disable` | Stop server |
| `hbridge --status` | Show server status |
| `hbridge --user add <name>` | Add a new user |
| `hbridge --user list` | List all users |
| `hbridge --stdio` | Run as MCP server (stdin/stdout) |

All endpoints except `/health` require **HTTP Basic Auth** (`user:hb_XXXX-XXXX` base64-encoded).

### Cross-Platform

| Platform | Status | Notes |
|----------|--------|-------|
| Windows 10/11 | ✅ | Spawn via `cmd.exe /d /s /c npx.cmd` |
| Linux (Ubuntu 22+) | ✅ | `npx` directly |
| macOS | ✅ | Same code path as Linux |

## 3. Hermes Integration

*This section is for the Hermes Agent. After the user enables hbridge, Hermes reads this config to connect.*

### Configuration

Add to `~/.hermes/config.yaml`:

```yaml
hbridge:
  dev:
    addr: 192.168.27.243:9190
    user: <username>
    key: hb_XXXX-XXXX    # shown once on --enable
```

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check → `{"status":"ok"}` |
| `/v1/task/create` | POST | Create a task → spawns Claude Code CLI |
| `/v1/task/output?task_id=xxx` | GET | Get task result from inbox (persistent) |
| `/v1/task?task_id=xxx` | GET | Get task status only |

### Task Lifecycle

```
Hermes                          hbridge:9190                    Claude Code (persistent)
  │                                │                                │
  │  POST /v1/task/create          │                                │
  │  {"prompt":"fix bug"}          │                                │
  │──────────────────────────────▶│                                │
  │  {"task_id":"task_xxx",       │  stdin (NDJSON):               │
  │   "status":"created"}         │  {"type":"user",               │
  │◀──────────────────────────────│   "session_id":"",             │
  │  (immediate, no wait)         │   "message":{"role":"user",    │
  │                                │    "content":"fix bug"},      │
  │                                │   "parent_tool_use_id":null}  │
  │                                │──────────────────────────────▶│
  │                                │                                │  execute
  │                                │  stdout (NDJSON):              │
  │                                │  {"role":"assistant",          │
  │                                │   "content":[{"type":"text",   │
  │                                │    "text":"Fixed..."}]}       │
  │                                │◀──────────────────────────────│
  │                                │  (completion via stop_reason   │
  │                                │   or type=="result")           │
  │                                │                                │
  │  GET /v1/task/output?          │                                │
  │    task_id=task_xxx            │                                │
  │──────────────────────────────▶│                                │
  │  {"retrieval_status":"success",│                                │
  │   "task":{"status":"done",    │                                │
  │    "result":"Fixed...",       │                                │
  │    "exitCode":0}}             │                                │
  │◀──────────────────────────────│                                │
```

### Quick Check (curl)

```bash
BASE64=$(echo -n "<username>:hb_XXXX-XXXX" | base64)
curl http://192.168.27.243:9190/health -H "Authorization: Basic $BASE64"
# → {"status":"ok"}
```

### Python SDK Example

```python
import requests, base64, time, json

ADDR = "192.168.27.243:9190"
AUTH = base64.b64encode(b"<username>:hb_XXXX-XXXX").decode()
HEADERS = {"Authorization": f"Basic {AUTH}"}

# Create task
r = requests.post(f"http://{ADDR}/v1/task/create",
    json={"prompt": "Fix StockMan bug"},
    headers=HEADERS)
task_id = r.json()["task_id"]
print(f"Task: {task_id}")

# Poll for output
while True:
    r = requests.get(
        f"http://{ADDR}/v1/task/output?task_id={task_id}",
        headers=HEADERS)
    d = r.json()
    if d.get("retrieval_status") == "success":
        print(f"Done: exit={d['task']['exitCode']}")
        print(d["task"]["result"])
        break
    time.sleep(3)
```

### Security

- **Default-off**: User must run `hbridge --enable` (or `/mcp hbridge enable` in Claude Code) before Hermes can connect. No attack surface when disabled.
- **Key once**: Access key (`hb_XXXX-XXXX`) is shown once on `--enable`. User dictates the key to the Hermes operator. Keys use 8 Base52 characters (`crypto.randomBytes()`), ~45.6 bits of entropy.
- **Local-only**: Auth required for all endpoints except `/health`. No external API, no data leaves the machine.

## Claude Code Integration

hbridge auto-registers as an MCP server on `npm install` (via postinstall):

```
~/.claude.json:
  mcpServers.hbridge → node dist/hbridge.mjs --stdio

~/.claude/settings.json:
  statusLine.command → node dist/statusline.mjs
```

### MCP Tools (in Claude Code)

| Tool | Description |
|------|-------------|
| `hbridge_enable` | Start hbridge HTTP server, generate key |
| `hbridge_disable` | Stop hbridge |
| `hbridge_status` | Show server status + recent Hermes tasks |
| `hbridge_user_add` | Add a user |
| `hbridge_user_list` | List all users |

### Status Bar

When hbridge is running, the bottom-right corner shows service status (Claude Code polls ~3-5s):

```
▶️ hbridge: on | :9190 | 📨"fix bug"     ← task running
▶️ hbridge: on | :9190 | ✅"echo hello"  ← task done (exit:0)
⏹️ hbridge: off                           ← service stopped
```

## Testing

```bash
# All tests (plain Node.js, no framework)
for f in tests/test_*.mjs; do node "$f"; done
# 354 tests, 7 suites
```

Note: `test_setup_mcp.mjs` requires Linux paths (stale test, needs update).

## License

MIT

## Reference Documents

| Document | Description |
|----------|-------------|
| [docs/spawn-mechanism.md](docs/spawn-mechanism.md) | Persistent Claude process spawn protocol (stdin/ stdout / completion detection) |
| [docs/mcp-spec.md](docs/mcp-spec.md) | MCP protocol spec mapping to hbridge implementation |
| [docs/local-mode.md](docs/local-mode.md) | Home Local Mode (HBRIDGE_HOME) design — zero-config local setup |
| [docs/optimization.md](docs/optimization.md) | Optimization ideas and known issues |
| [DESIGN.md](DESIGN.md) | Architecture, key format, task queuing, configuration files |
