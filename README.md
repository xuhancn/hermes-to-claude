# Hermes-to-Claude (h2c)

**Hermes-Agent** controls multiple **Claude Code** instances via HTTP — one agent, many Claude workers. No Pro/Max subscription required.

```
📱 User ----HTTP----> 🤖 Hermes-Agent ----h2c----> 🏭 Claude Code (deploy role)
                            ├----h2c----> 🔧 Claude Code (coding role)
                            ├----h2c----> 🧪 Claude Code (testing role)
                            └----h2c----> 🔬 Claude Code (building role)
```

---

## 1. h2c Advantages

- **No Pro/Max required** — works with any Claude Code via stdio; no Anthropic subscription needed.
- **One agent, many Claudes** — one Hermes-Agent routes tasks to multiple Claude Code instances, each in its own project directory with its own CLAUDE.md and skills.
- **Default-off, secure** — zero ports open until you explicitly `enable`. Auth key protects all endpoints.
- **Cross-platform** — Windows / Linux / macOS. Single codebase.
- **Local-only** — no cloud, no external API. Fully offline.

---

## 2. For Human Users

### Prepare

h2c requires **Node.js ≥ 20**. Install it for your platform:

| Platform | Command |
|----------|---------|
| Linux (Ubuntu/Debian) | `sudo apt install nodejs npm` |
| macOS | `brew install node` |
| Windows | `winget install OpenJS.NodeJS` or download from https://nodejs.org |

### Installation

**For End User**, One command to install globally:

```bash
npm install -g hermes-to-claude
```

This makes the `h2c` command available everywhere on your system.


**For Developer**, For contributors who want to hack on h2c itself:

```bash
git clone https://github.com/xuhancn/hermes-to-claude.git
cd hermes-to-claude
npm install && npm run build
```

### Start in Claude Code

After installation, enable h2c from inside Claude Code:

```
/h2c enable
```

This starts the HTTP server. The port is derived from the working directory (see Authentication and Port below). Check status at any time:

```
/h2c status
```

### Home Mode — For Headless Machines

When Hermes-Agent runs on a server with no display, no manual command is needed. Export the **environment variable** before starting h2c:

```bash
# Linux / macOS
H2C_HOME=1

# Windows (Command Prompt)
set H2C_HOME=1

# Windows (PowerShell)
$env:H2C_HOME = "1"
```

With Home mode active, the server listens on `127.0.0.1` only. Authentication is **disabled** — safe because only local processes can reach it. Hermes-Agent connects without managing keys.

### Authentication and Port

The port is **deterministic**: `MD5(cwd)` → first 2 bytes → `9200 + (value % 600)`. Each project directory gets its own port. This is intentional:

- Each Claude Code instance runs in its own working directory
- Claude reads its own CLAUDE.md, skills, and project files from that directory
- Port = project — you always know which Claude you're talking to

The auth key (`h2c_` + 8 random base52 characters) is written to `~/.h2c_key` once and reused across all directories on the same machine. All HTTP endpoints (except `/health`) require HTTP Basic Auth with username `bridge` and the key as password.

---

## 3. For Hermes-Agent

Hermes-Agent discovers and controls h2c via HTTP. Here is the complete API.

### Security

Like Claude Code CLI, h2c requires authentication for all mutating endpoints. But Hermes-Agent can simplify — either handle the auth flow itself, or bypass it entirely with `skip_permissions` for trusted workloads. Hermes-Agent must handle the same authentication and permission flow that human users would, or explicitly choose to bypass it.

### Create a Task

Spawn a Claude Code session:

```bash
curl -X POST http://<host>:<port>/v1/task/create \
  -H "Authorization: Basic <base64(bridge:key)>" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "fix the off-by-one bug in main.c"}'
# → {"task_id":"task_xxx","status":"created"}
```

To skip permission prompts for development workloads:

```bash
curl -X POST http://<host>:<port>/v1/task/create \
  -H "Authorization: Basic <base64(bridge:key)>" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "...", "skip_permissions": true}'
```

| Optional field | Type | Description |
|---------------|------|-------------|
| `permission_mode` | `"approve"` (default) or `"bypass"` | Tool approval behavior |
| `skip_permissions` | `boolean` | Skip all permission prompts |
| `cwd` | string | Working directory for the Claude session |
| `sessionId` | string | Reuse an existing Claude session |

### Connect Hermes-Agent

Give Hermes-Agent the port and key. Add to `~/.hermes/config.yaml`:

```yaml
# Single h2c instance
h2c:
  project: my-app
  cwd: /path/to/project
  host: <ip>
  port: <port>
  key: h2c_XXXXXXXX

# Multiple machines (10 h2c instances):
h2c_farm:
  coding:
    host: 192.168.27.88
    port: 9761
    key: h2c_XXXXXXXX
    cwd: /home/xu/coding
  testing:
    host: 192.168.27.243
    port: 9709
    key: h2c_YYYYYYYY
    cwd: /home/xu/testing
  building:
    host: 192.168.27.225
    port: 9352
    key: h2c_ZZZZZZZZ
    cwd: /home/xu/building
```

Hermes-Agent reads the config and dispatches tasks to the right machine based on project. See the API reference below.

### Health Check

Verify the server is reachable — no authentication required:

```bash
curl http://<host>:<port>/health
# → {"status":"ok"}
```

Check health after creating a task to confirm the bridge is running and ready.

### Get Task Output

Poll until `status` is `"done"` or `"failed"`. Long-running tasks (code generation, test suites) may take minutes.

```bash
curl "http://<host>:<port>/v1/task/output?task_id=task_xxx" \
  -H "Authorization: Basic <base64(bridge:key)>"
# → {"retrieval_status":"success","task":{"status":"done","result":"Fixed.","exitCode":0}}
```

### Cancel a Task

```bash
curl -X POST http://<host>:<port>/v1/task/cancel \
  -H "Authorization: Basic <base64(bridge:key)>" \
  -H "Content-Type: application/json" \
  -d '{"task_id":"task_xxx"}'
```

### Permission Pipeline

h2c includes a full permission pipeline — just like CI tools. Hermes-Agent can decide per-task how to handle tool approvals:

| Mode | Behavior |
|------|----------|
| `approve` (default) | Claude sends `control_request` → Hermes decides allow/deny |
| `bypass` | Claude sends request but doesn't block; Hermes can log for audit |
| `skip_permissions` | `--dangerously-skip-permissions` — no requests, maximum speed |

For quick development tasks, use `skip_permissions`. For production workloads that need an audit trail, keep the default `approve` mode. Hermes-Agent can also respond with `updatedInput` to modify tool parameters before Claude executes them.

### Architecture

```
Hermes ──HTTP──▶ h2c :<port> ──spawn──▶ Session (Claude Code)
  │                   │                              │
  │  Control Layer    │  server.mjs (HTTP routing)    │  reads CLAUDE.md
  │  (create/cancel/  │  bridge.mjs (session pool)    │  loads skills
  │   output/poll)    │  session.mjs (per-task proc)  │  edits files
  │                   │                              │
  │  Transport Layer  │  StdioTransport               │
  │  (SSE streaming)  │  (NDJSON stdin/stdout pipe)   │  Claude stdout
  │                   │                              │
  └─ poll or SSE ◀────┴─ task output (status/result) ─┘
```

Hermes-Agent dispatches tasks through two layers:

- **Control Layer**: HTTP endpoints for task lifecycle — create, cancel, poll for results, health. This is what Sections 3.1–3.5 describe.
- **Transport Layer**: Streaming, real-time progress, and persistent transcript via SSE and NDJSON. This is described below.

Claude Code loads project-specific CLAUDE.md and skills from the working directory as a per-task child process. Each session is isolated.

### Transport Layer

Beyond polling `getTaskOutput`, Hermes-Agent can receive **real-time streaming** via Server-Sent Events (SSE) and read the raw Claude Code NDJSON transcript:

#### SSE Streaming

Subscribe to a task's output stream to receive events as they happen — no polling needed:

```bash
curl -N "http://<host>:<port>/v1/task/output/stream?task_id=task_xxx" \
  -H "Authorization: Basic <base64(bridge:key)>"
# event: chunk
# data: {"task_id":"task_xxx","chunk":"Fixing the off-by-one...\n"}
#
# event: done
# data: {"task_id":"task_xxx","status":"done","exitCode":0}
```

Event types pushed over SSE:

| Event | Description |
|-------|-------------|
| `chunk` | Incremental text output from Claude Code |
| `status` | Task status change (running → done / failed) |
| `tool_progress` | Tool execution progress (tool name + elapsed time) |
| `permission_request` | Claude requests tool approval (in `approve` mode) |

#### NDJSON Transcript

The raw Claude Code stdout is saved to `~/.h2c_transcript.jsonl`. Each line is a complete NDJSON message from Claude Code — `assistant` messages, `stream_event` deltas, `tool_use` blocks, and `result` messages with usage data:

```jsonl
{"type":"stream_event","event":{"type":"content_block_delta","delta":{"type":"text_delta","text":"Fixing"}}}
{"type":"stream_event","event":{"type":"content_block_delta","delta":{"type":"text_delta","text":" the"}}}
{"type":"assistant","message":{"content":[{"type":"text","text":"Fixed the off-by-one error."}]}}
{"type":"result","subtype":"success","result":"...","usage":{"input_tokens":120,"output_tokens":45}}
```

Hermes-Agent can tail this file for full Claude Code session history, or consume the SSE stream for live updates. The transport layer ensures no output is lost — even if the HTTP connection drops, the transcript file preserves every message.


### Document References

| Document | Contents |
|----------|----------|
| [DESIGN.md](DESIGN.md) | Architecture, protocol, session lifecycle, permission pipeline, API reference, changelog |
| [docs/local-mode.md](docs/local-mode.md) | H2C_HOME auto-start mode |
| [docs/spawn-mechanism.md](docs/spawn-mechanism.md) | Claude Code spawn protocol, NDJSON format |
| [docs/mcp-spec.md](docs/mcp-spec.md) | MCP tool definitions (Claude Code integration) |

---

## License

MIT

Created by **Xu Han** — [github.com/xuhancn](https://github.com/xuhancn)
