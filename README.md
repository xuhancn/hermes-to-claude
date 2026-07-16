# Hermes-Claude-Bridge

> Forked from [soyou19/Open-ClaudeCode](https://github.com/soyou19/Open-ClaudeCode) — bridge transport layer extracted as standalone project, auth code removed, all dependencies inlined into `claude-code-deps/`.

Local JSON-RPC bridge connecting Hermes Agent to Claude Code — no Pro/Max subscription required.

## Design

## Why hbridge\n\n- **Leverages Claude Code built-in security** — Auto Mode protects your filesystem\n- **Simpler than SSH** — no key pairs, no authorized_keys\n- **Zero external API** — local-only, no subscription\n- **Independent auth** — hb_ keys, not OS accounts\n- **Default-off** — no attack surface when disabled

### Architecture


```
Hermes Agent                    Claude Code CLI
    │                                │
    │  JSON-RPC over stdin/stdout    │
    │←─────────────────────────────→│
    │                                │
  methods:                          Internally:
  - task.create                   - Read/write files
  - task.status                   - Execute commands
  - task.stop                     - Git operations
```

### Remote Mode (HTTP + SSH Tunnel)

Bridge 以 HTTP 服务形式运行在某台机器上，另一台机器上的 Hermes 通过 SSH 隧道调用：

```
┌─── Hermes 宿主机 (Mac) ────────────┐
│                                     │
│  Hermes Agent ──stdio──▶ Bridge Server (HTTP :9090)
│       ▲                            │
│       │                            │ SSH tunnel
│   Telegram 网关                     │
└───────┼────────────────────────────┼───┘
        │                            │
   手机指令                   ┌──────▼──────────┐
                             │ Claude 宿主机      │
                             │ (Windows)          │
                             └───────────────────┘
```

On the Mac:
```bash
node dist/bridge.mjs --http :9090
```
On the remote machine:
```bash
ssh -L 9090:localhost:9090 mac-mini
```
Hermes 侧配置指向 `localhost:9090` 即可。

## 依赖

- **Node.js ≥ 20**（推荐 22 LTS）
- **Claude Code CLI**（`npx @anthropic-ai/claude-code`，cc-switch 可用）
- **Hermes Agent** 任意版本

## 编译（所有平台）

本项目纯 TypeScript，编译为单文件可执行脚本：

```bash
git clone https://github.com/xuhancn/hermes-claude-bridge.git
cd hermes-claude-bridge
npm install
npm run build          # → dist/bridge.mjs
```

## 安装

### Linux

```bash
# 1. 装 Node.js
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# 2. 克隆 + 编译
git clone <repo> && cd hermes-claude-bridge
npm install && npm run build

# 3. 验证
node dist/bridge.mjs --help
```

### macOS

```bash
brew install node@22
git clone <repo> && cd hermes-claude-bridge
npm install && npm run build
node dist/bridge.mjs --help
```

### Windows

```powershell
winget install OpenJS.NodeJS.LTS
git clone <repo> ; cd hermes-claude-bridge
npm install ; npm run build
node dist/bridge.mjs --help
```

## 部署

### Hermes 侧配置

在 `~/.hermes/config.yaml` 添加：

```yaml
mcp_servers:
  claude_code:
    command: "node"
    args: ["/path/to/hermes-claude-bridge/dist/bridge.mjs"]
    env:
      CLAUDE_PROJECT_ROOT: "/home/xu/projects/StockMan"
```

### Claude Code 侧配置

```json
// ~/.claude/claude_desktop_config.json
{
  "mcpServers": {
    "hermes": {
      "command": "hermes",
      "args": ["mcp", "serve"]
    }
  }
}
```

## 使用

### Hermes → Claude Code（会话控制）

```
/hermes task-create "修复 StockMan ReducePosPolicy bug"
/hermes task-status
/hermes task-stop
```

### Claude Code → Hermes（自动化）

Claude 可调 Hermes cron、发送 Telegram 通知、触发盘前扫描。

## 协议

基于 JSON-RPC 2.0 over stdio：

```json
{"jsonrpc":"2.0","method":"task/create","params":{"prompt":"..."},"id":1}
{"jsonrpc":"2.0","result":{"sessionId":"cse_xxx"},"id":1}
```

## License

MIT
