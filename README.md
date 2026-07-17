# Hermes-Claude-Bridge (hbridge)

Local HTTP bridge connecting **Hermes Agent** to **Claude Code** via a persistent JSON-RPC process — no Pro/Max subscription required.

```
Hermes ──HTTP──▶ hbridge:9190 ──stdio──▶ Claude Code (persistent --print --verbose)
  (remote)                  (NDJSON)      stdin: {"type":"user","session_id":"","message":{"role":"user","content":"fix bug"},"parent_tool_use_id":null}
                                          stdout: {"role":"assistant","content":[{"type":"text","text":"Done."}]}
```

## Advanced of hbridge

### Leverages Claude Code's built-in security

hbridge delegates all file operations to Claude Code's permission system. Hermes never touches your filesystem directly — Claude Code's Auto Mode prompts for consent before every read/write. No blind file access, no sandbox bypass.

### Simple auth

One-time key generation via `hbridge --enable`. Keys use `hb_XXXX-XXXX` format built from 8 Base52 characters (`crypto.randomBytes()`), providing ~45.6 bits of entropy. No SSH setup, no certificate management, no OAuth — just a key.

### Zero external API

Everything runs on localhost. No cloud dependency, no API keys to manage, no data ever leaves your machine. Works fully offline with no Anthropic subscription or external service required.

### Default-off

hbridge starts in stopped state. The HTTP server only listens after explicit `--enable` (or the `hbridge_enable` MCP tool call in Claude Code). When disabled, zero ports open — no attack surface.

### Cross-platform

Single codebase tested on Windows 10/11, Linux (Ubuntu 22+), and macOS. Windows uses `cmd.exe /d /s /c npx.cmd` for spawn; Linux and macOS use `npx` directly. Same install experience everywhere.

## Prerequisites

Install **Node.js 22+** if you don't have it yet:

**Linux (Ubuntu/Debian)**
```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
```

**macOS**
```bash
brew install node@22
```

**Windows**
```powershell
winget install OpenJS.NodeJS.LTS
```

Verify it's installed:
```bash
node --version   # v22.x.x
```

## Quick Start

```bash
# Install
git clone https://github.com/xuhancn/hermes-claude-bridge.git
cd hermes-claude-bridge
npm install                    # build + MCP auto-register in postinstall
npm install -g .               # global `hbridge` command (optional)

# Start
hbridge --enable xu
# or: node dist/hbridge.mjs --enable xu
```

## Hermes Integration

### Configuration

Add to `~/.hermes/config.yaml`:

```yaml
hbridge:
  dev:
    addr: 192.168.27.243:9190
    user: xu
    key: hb_XXXX-XXXX    # shown once on --enable
```

### API

All endpoints require **HTTP Basic Auth** (`user:hb_XXXX-XXXX` base64-encoded).

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
BASE64=$(echo -n "xu:hb_XXXX-XXXX" | base64)
curl http://192.168.27.243:9190/health -H "Authorization: Basic $BASE64"
# → {"status":"ok"}
```

### Python SDK Example

```python
import requests, base64, time, json

ADDR = "192.168.27.243:9190"
AUTH = base64.b64encode(b"xu:hb_XXXX-XXXX").decode()
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
- **Key once**: Access key (`hb_XXXX-XXXX`) is shown once on `--enable`. User dictates the key to the Hermes agent operator.
- **Local-only**: Auth required for all endpoints except `/health`. No external API dependency.

## Claude Code Integration

hbridge auto-registers as an MCP server on `npm install` (via `postinstall`):

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

## Architecture

```
Hermes ──HTTP──▶ hbridge:9190
                    │
              ┌─────▼──────┐
              │  mcp.mjs   │── MCP stdio ──▶ Claude Code
              │  (HTTP +   │                    │
              │   MCP)     │◀─ NDJSON ──────────┘
              └─────┬──────┘   stdin/stdout
                    │          (persistent --print
              ┌─────▼──────┐    stream-json --verbose)
              │ bridge.mjs │
              │ (persistent│
              │  Claude    │
              │  process)  │
              └─────┬──────┘
                    │
              ┌─────▼──────┐
              │ state.mjs  │── ~/.hbridge_state.json
              └────────────┘
```

## CLI Commands

```bash
hbridge --enable xu              # Start server + generate key
hbridge --disable                # Stop server
hbridge --status                 # Show status
hbridge --user add han           # Add user
hbridge --user list              # List users
hbridge --stdio                  # Run as MCP server (stdin/stdout)
```

## Testing

```bash
# All tests (plain Node.js, no framework)
for f in tests/test_*.mjs; do node "$f"; done
# 354 tests, 7 suites
```

Note: `test_setup_mcp.mjs` requires Linux paths (stale test, needs update).

## Cross-Platform

| Platform | Status | Notes |
|----------|--------|-------|
| Windows 10/11 | ✅ | Use `cmd.exe` for npx spawn |
| Linux (Ubuntu 22+) | ✅ | Tested on x86_64 |
| macOS | ✅ | Same code path as Linux |

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
