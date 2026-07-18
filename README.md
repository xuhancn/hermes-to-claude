# Hermes-Claude-Bridge (hbridge)

Local HTTP bridge connecting **Hermes Agent** to **Claude Code** — **no Pro/Max subscription required**.

```
📱 User ----HTTP----> 🤖 Hermes-Agent ----hbridge----> 🏭 Claude Code (deploy role)
                            ├───hbridge───> 🔧 Claude Code (coding role)
                            ├───hbridge───> 🧪 Claude Code (testing role)
                            └───hbridge───> 🔬 Claude Code (building role)
```



## Quick Start

```bash
# Install
git clone https://github.com/xuhancn/hermes-claude-bridge.git
cd hermes-claude-bridge
npm install && npm run build

# Start server
hbridge --enable

# Health check
curl http://127.0.0.1:9761/health
# → {"status":"ok"}

# Create a task
curl -X POST http://127.0.0.1:9761/v1/task/create \
  -H "Content-Type: application/json" \
  -d '{"prompt":"say hello in one word"}'
# → {"task_id":"task_xxx","status":"created"}

# Get result (poll until success)
curl http://127.0.0.1:9761/v1/task/output?task_id=task_xxx
# → {"retrieval_status":"success","task":{"result":"Hello.","usage":{...}}}
```

## Commands

| Command | Description |
|---------|-------------|
| `hbridge --enable` | Start server (port derived from cwd, key from `~/.hbridge_key`) |
| `hbridge --disable` | Stop server |
| `hbridge --status` | Show server status + last client connection |

When `HBRIDGE_HOME=1`, the server auto-starts — no subcommand needed.

All endpoints except `/health` require the key via HTTP Basic Auth.

Created by **Xu Han** — [github.com/xuhancn](https://github.com/xuhancn)

## Document References

| Document | Contents |
|----------|----------|
| [DESIGN.md](DESIGN.md) | Architecture, protocol, session lifecycle, permission pipeline, API reference, changelog |
| [docs/local-mode.md](docs/local-mode.md) | HBRIDGE_HOME auto-start mode |
| [docs/spawn-mechanism.md](docs/spawn-mechanism.md) | Claude Code spawn protocol, NDJSON format |
| [docs/mcp-spec.md](docs/mcp-spec.md) | MCP tool definitions (Claude Code integration) |

## License

MIT
