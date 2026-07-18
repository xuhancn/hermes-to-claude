# Hermes-Claude-Bridge (hbridge)

Local HTTP bridge connecting **Hermes Agent** to **Claude Code** via per-task Claude Code child processes — **no Pro/Max subscription required**.

```
Hermes ──HTTP──▶ hbridge:<port> ──spawn──▶ Claude Code (per-task session)
  (remote)                  (NDJSON)        stdin: {"type":"user","message":{"role":"user","content":"fix bug"}}
                                            stdout: {"role":"assistant","content":[{"type":"text","text":"Done."}]}
```

**Use cases:**

- **Remote control**: Send tasks from your phone via Hermes — hbridge spawns Claude Code for each task. Fix bugs, review code, run commands without sitting at your desk.
- **Dev assistant**: Hermes handles lightweight tasks; when it hits a codebase-specific problem, it delegates to Claude Code via hbridge. Claude reads the project, edits files, runs tests, and reports back.
- **Centralized hub**: Hermes becomes your single entry point — it routes tasks to the right tool (Claude Code, web search, etc.) and aggregates results. hbridge is the Claude Code plugin in this ecosystem.

## Advanced of hbridge

- **Security**: Hermes never touches your filesystem — all file ops go through Claude Code's permission system. No blind access.
- **Auth**: Random key `hb_` + 8 base52 chars — generated once, stored in `~/.hbridge_key`. One key per machine, not per directory. Same key works across all projects on the same machine.
- **Local-only**: Fully offline. No cloud, no external API, no Anthropic subscription.
- **Default-off**: Zero ports open until explicit `--enable`. No attack surface when disabled.
- **Cross-platform**: Windows (cmd.exe), Linux, macOS — single codebase, tested on all three.

## 1. Design Framework

```
Hermes ──HTTP──▶ hbridge :<port> ──spawn──▶ Session (Claude Code)
                      │                              │
                      │  server.mjs (HTTP routing)    │  reads CLAUDE.md
                      │  bridge.mjs (session pool)    │  loads skills
                      │  session.mjs (per-task proc)  │  edits files
                      │  persistence.mjs (JSONL)      │
                      └───────────────────────────────┘
```

Each task gets its own `Session` (one Claude Code child process), managed by a session pool. Up to 3 tasks run concurrently by default. Completed tasks are persisted to `~/.hbridge_tasks.jsonl` and survive server restarts.

**Detail references:**
- [Spawn protocol](docs/spawn-mechanism.md) — Claude spawn command, NDJSON message format, completion detection
- [MCP spec mapping](docs/mcp-spec.md) — MCP lifecycle, tool definitions, response formats
- [Home local mode](docs/local-mode.md) — zero-config auto-start mode
- [Module design](DESIGN.md) — key format, session pool, persistence

### Design Rationale: Key vs Port

**Key is machine-global**, **port is per-directory**. This follows Claude Code's working-directory-centric model.

Claude Code reads its context — `CLAUDE.md`, project skills, `.claude/settings.json` — from the **current working directory**. Each project has its own conventions, its own skills, its own CLAUDE.md. To serve the right context, hbridge must spawn Claude Code in the right directory.

```
/project-a/CLAUDE.md  →  hbridge :9200  →  Claude Code (cwd=/project-a)
/project-b/CLAUDE.md  →  hbridge :9201  →  Claude Code (cwd=/project-b)
```

**Port per directory** (`9200 + MD5(cwd) % 600`) means:
- Each project gets a stable, predictable port
- You can run hbridge for multiple projects on the same machine without conflict
- The port is deterministic — Hermes computes it from the directory path without asking the server

**Key per machine** means:
- Hermes only needs one credential per machine, not one per project
- The key is random, generated once, persisted in `~/.hbridge_key`
- Same auth works across all directories on the same host

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
| `hbridge --enable` | Start server with random persistent key |
| `hbridge --disable` | Stop server |
| `hbridge --status` | Show server status + last client connection |

When `HBRIDGE_HOME=1`, the server auto-starts — no subcommand needed.

Port is derived deterministically from cwd (one port per project). Key is random, generated once and persisted in `~/.hbridge_key` (one key per machine, works for all directories).
All endpoints except `/health` require the key via **HTTP Basic Auth** (`user:hb_xxxx` base64-encoded).

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
  project_name:
    addr: 192.168.27.243:<port>    # run hbridge --status for port
    key: hb_jJTitzkw               # random per-machine, persisted in ~/.hbridge_key
    cwd: /path/to/project          # working directory for Claude Code tasks
```

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check → `{"status":"ok"}` |
| `/v1/task/create` | POST | Create a task → spawns Claude Code CLI |
| `/v1/task/cancel` | POST | Cancel a running or queued task |
| `/v1/task/permission` | POST | Respond to a pending `can_use_tool` permission request |
| `/v1/task/output?task_id=xxx` | GET | Get task result (from memory or disk) |
| `/v1/task/output/stream?task_id=xxx` | GET | SSE streaming for progressive output |
| `/v1/task?task_id=xxx` | GET | Get task status only |

### Permission Pipeline

By default, every tool Claude tries to use (Bash, Read, Write, Edit, etc.) requires Hermes approval:

```
Claude wants to run Bash("git push")
  → SSE: {"type":"permission_request","task_id":"t1","tool_name":"Bash","input":{"command":"git push"}}
    → Hermes decides:
      → POST /v1/task/permission {"task_id":"t1","behavior":"allow"}
      → POST /v1/task/permission {"task_id":"t1","behavior":"allow","updatedInput":{"command":"git push --dry-run"}}
      → POST /v1/task/permission {"task_id":"t1","behavior":"deny","message":"只允许读操作"}
```

Hermes can also set the permission mode per-task at creation:

```json
POST /v1/task/create
{"prompt":"fix bug","permission_mode":"approve"}    // wait for Hermes on each tool (default)
{"prompt":"fix bug","permission_mode":"bypass"}     // auto-approve all tools
{"prompt":"fix bug","skip_permissions":true}        // --dangerously-skip-permissions
```

### Task Lifecycle

```
Hermes                          hbridge:<port>                    Session (Claude Code)
  │                                │                                │
  │  POST /v1/task/create          │                                │
  │  {"prompt":"fix bug"}          │                                │
  │──────────────────────────────▶│                                │
  │  {"task_id":"task_xxx",       │  spawn Claude Code              │
  │   "status":"created"}         │  stdin (NDJSON):                │
  │◀──────────────────────────────│  {"type":"user",               │
  │  (immediate, no wait)         │   "message":{"role":"user",    │
  │                                │    "content":"fix bug"},       │
  │                                │──────────────────────────────▶│
  │                                │                                │  execute
  │                                │  stdout (NDJSON):              │
  │                                │  stream_event (progressive)    │
  │                                │  SSE: chunk events             │
  │                                │  result / stop_reason          │
  │                                │◀──────────────────────────────│
  │                                │  task persisted to disk        │
  │                                │                                │
  │  GET /v1/task/output?          │                                │
  │    task_id=task_xxx            │                                │
  │──────────────────────────────▶│                                │
  │  {"retrieval_status":"success",│                                │
  │   "task":{"status":"done",    │                                │
  │    "result":"Fixed...",       │                                │
  │    "exitCode":0,              │                                │
  │    "usage":{...}}}            │                                │
  │◀──────────────────────────────│                                │
```

### SSE Streaming Events

Connect to `/v1/task/output/stream?task_id=xxx` to receive real-time events:

```
data: {"type":"connected","taskId":"task_xxx"}
data: {"type":"chunk","text":"Fixing bug..."}
data: {"type":"permission_request","task_id":"t1","tool_name":"Bash","input":{"command":"git status"}}
data: {"type":"done","exitCode":0}
```

### Quick Check (curl)

```bash
# Get port from --status
PORT=$(hbridge --status 2>&1 | grep -oP ':\K\d+')

# Health
curl http://127.0.0.1:$PORT/health
# → {"status":"ok"}

# Create a task
curl -X POST http://127.0.0.1:$PORT/v1/task/create \
  -H "Content-Type: application/json" \
  -d '{"prompt":"say hello in one word"}'
# → {"task_id":"task_xxx","status":"created"}

# Poll for result (repeat until retrieval_status: success)
curl http://127.0.0.1:$PORT/v1/task/output?task_id=task_xxx
# → {"retrieval_status":"success","task":{"result":"Hello.","usage":{...}}}

# With auth (remote mode)
BASE64=$(echo -n "x:hb_CVrNBdvl" | base64 -w0)
curl http://192.168.1.100:$PORT/v1/task/create \
  -H "Authorization: Basic $BASE64" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"hello"}'
```

### Python SDK Example

```python
import requests, base64, time, json

ADDR = "192.168.27.243:<port>"
AUTH = base64.b64encode(b"x:hb_CVrNBdvl").decode()
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
        print(f"Usage: {d['task']['usage']}")
        break
    time.sleep(3)
```

### Security

- **Default-off**: User must run `hbridge --enable` before Hermes can connect. No attack surface when disabled.
- **Persistent key**: Random `hb_` + 8 base52 chars — generated once, stored in `~/.hbridge_key` (machine-global). Same key for all directories on one machine. No user management.
- **Auth for remote, skip for home**: When `HBRIDGE_HOME=1`, auth is skipped (localhost-only). Without it, auth is enforced for all endpoints except `/health`.
- **Local-only**: No external API, no data leaves the machine.

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
| `hbridge_enable` | Start hbridge HTTP server, show server key |
| `hbridge_disable` | Stop hbridge |
| `hbridge_status` | Show server status + last client connection info |
| `hbridge_status_bar` | Show/hide hbridge status in Claude Code status bar |

### Status Bar

When hbridge is running, the bottom-right corner shows service status (Claude Code polls ~3-5s):

```
▶️ hbridge: on | :<port>                ← service running
⏹️ hbridge: off                           ← service stopped
```

## Testing

```bash
# All tests (plain Node.js, no framework)
for f in tests/test_*.mjs; do node "$f"; done
# ~280 tests, all suites
```

## License

MIT

## Reference Documents

| Document | Description |
|----------|-------------|
| [docs/spawn-mechanism.md](docs/spawn-mechanism.md) | Claude spawn command, NDJSON message format, completion detection |
| [docs/mcp-spec.md](docs/mcp-spec.md) | MCP protocol spec mapping to hbridge implementation |
| [docs/local-mode.md](docs/local-mode.md) | Home Local Mode (HBRIDGE_HOME) — zero-config local setup |
| [docs/optimization.md](docs/optimization.md) | Known issues and resolved items |
| [DESIGN.md](DESIGN.md) | Architecture, session pool, permission pipeline, persistence |
