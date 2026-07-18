# Hermes-Claude-Bridge (hbridge)

**Hermes-Agent** controls multiple **Claude Code** instances via HTTP — one agent, many Claude workers. No Pro/Max subscription required.

```
📱 User ----HTTP----> 🤖 Hermes-Agent ----hbridge----> 🏭 Claude Code (deploy role)
                            ├───hbridge───> 🔧 Claude Code (coding role)
                            ├───hbridge───> 🧪 Claude Code (testing role)
                            └───hbridge───> 🔬 Claude Code (building role)
```

---

## 1. hbridge Advantages

- **No Pro/Max required** — works with any Claude Code via stdio; no Anthropic subscription needed.
- **One agent, many Claudes** — one Hermes-Agent routes tasks to multiple Claude Code instances, each in its own project directory with its own CLAUDE.md and skills.
- **Default-off, secure** — zero ports open until you explicitly `enable`. Auth key protects all endpoints.
- **Cross-platform** — Windows / Linux / macOS. Single codebase.
- **Local-only** — no cloud, no external API. Fully offline.

---

## 2. For Human Users

### Prepare

hbridge requires **Node.js ≥ 20**. Install it for your platform:

| Platform | Command |
|----------|---------|
| Linux (Ubuntu/Debian) | `sudo apt install nodejs npm` |
| macOS | `brew install node` |
| Windows | `winget install OpenJS.NodeJS` or download from https://nodejs.org |

### Install

```bash
git clone https://github.com/xuhancn/hermes-claude-connector.git
cd hermes-claude-connector
npm install && npm run build
```

### Start in Claude Code

After installation, enable hbridge from inside Claude Code:

```
/hbridge enable
```

This starts the HTTP server. The port is derived from the working directory (see Authentication and Port below). Check status at any time:

```
/hbridge status
```

### Home Mode — For Headless Machines

When Hermes-Agent runs on a server with no display, no manual command is needed. Export the **environment variable** before starting hbridge:

```bash
export HBRIDGE_HOME=1       # environment variable — auto-starts hbridge
```

With Home mode active, the server listens on `127.0.0.1` only. Authentication is **disabled** — safe because only local processes can reach it. Hermes-Agent connects without managing keys.

### Authentication and Port

The port is **deterministic**: `MD5(cwd)` → first 2 bytes → `9200 + (value % 600)`. Each project directory gets its own port. This is intentional:

- Each Claude Code instance runs in its own working directory
- Claude reads its own CLAUDE.md, skills, and project files from that directory
- Port = project — you always know which Claude you're talking to

The auth key (`hb_` + 8 random base52 characters) is written to `~/.hbridge_key` once and reused across all directories on the same machine. All HTTP endpoints (except `/health`) require HTTP Basic Auth with username `bridge` and the key as password.

---

## 3. For Hermes-Agent

Hermes-Agent discovers and controls hbridge via HTTP. Here is the complete API:

### Health Check

No authentication required.

```bash
curl http://127.0.0.1:<port>/health
# → {"status":"ok"}
```

### Create a Task

Spawn a Claude Code session. Set `skip_permissions: true` for development workloads to bypass tool-approval prompts.

```bash
curl -X POST http://127.0.0.1:<port>/v1/task/create \
  -H "Authorization: Basic <base64(bridge:key)>" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "fix the off-by-one bug in main.c"}'
# → {"task_id":"task_xxx","status":"created"}
```

| Optional field | Type | Description |
|---------------|------|-------------|
| `permission_mode` | `"approve"` (default) or `"bypass"` | Tool approval behavior |
| `skip_permissions` | `boolean` | Skip all permission prompts |
| `cwd` | string | Working directory for the Claude session |
| `sessionId` | string | Reuse an existing Claude session |

### Get Task Output

Poll until `status` is `"done"` or `"failed"`. Long-running tasks (code generation, test suites) may take minutes.

```bash
curl "http://127.0.0.1:<port>/v1/task/output?task_id=task_xxx" \
  -H "Authorization: Basic <base64(bridge:key)>"
# → {"retrieval_status":"success","task":{"status":"done","result":"Fixed.","exitCode":0}}
```

### Cancel a Task

```bash
curl -X POST http://127.0.0.1:<port>/v1/task/cancel \
  -H "Authorization: Basic <base64(bridge:key)>" \
  -H "Content-Type: application/json" \
  -d '{"task_id":"task_xxx"}'
```

### Permission Pipeline

Hermes-Agent can control which tools Claude Code is allowed to use:

| Mode | Behavior |
|------|----------|
| `approve` (default) | Claude sends `control_request` → Hermes decides allow/deny |
| `bypass` | Claude sends request but doesn't block; Hermes can still log |
| `skip_permissions` | `--dangerously-skip-permissions` — no requests at all |

Hermes-Agent can also respond with `updatedInput` to modify tool parameters before Claude executes them.

### Architecture

```
Hermes ──HTTP──▶ hbridge :<port> ──spawn──▶ Session (Claude Code)
                      │                              │
                      │  server.mjs (HTTP routing)    │  reads CLAUDE.md
                      │  bridge.mjs (session pool)    │  loads skills
                      │  session.mjs (per-task proc)  │  edits files
```

Hermes-Agent dispatches tasks; hbridge manages session lifecycle. Claude Code loads project-specific CLAUDE.md and skills from each working directory.

---

### Document References

| Document | Contents |
|----------|----------|
| [DESIGN.md](DESIGN.md) | Architecture, protocol, session lifecycle, permission pipeline, API reference, changelog |
| [docs/local-mode.md](docs/local-mode.md) | HBRIDGE_HOME auto-start mode |
| [docs/spawn-mechanism.md](docs/spawn-mechanism.md) | Claude Code spawn protocol, NDJSON format |
| [docs/mcp-spec.md](docs/mcp-spec.md) | MCP tool definitions (Claude Code integration) |

---

## License

MIT

Created by **Xu Han** — [github.com/xuhancn](https://github.com/xuhancn)
