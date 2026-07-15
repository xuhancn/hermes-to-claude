# Hermes-Claude-Bridge

本地 JSON-RPC 桥接，让 Hermes Agent 与 Claude Code 双向互通——不依赖 Anthropic Pro/Max 订阅。

## 设计

```
Hermes Agent                    Claude Code CLI
    │                                │
    │  JSON-RPC over stdin/stdout    │
    │←─────────────────────────────→│
    │                                │
  methods:                          内部:
  - task.create                   - 读写文件
  - task.status                   - 执行命令
  - task.stop                     - Git操作
```

Hermes 通过 `npx claude mcp serve`（Claude Code 内置 MCP）启动桥进程，
双方通过 stdio 传输 JSON-RPC 消息。

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

## 跨机器远程桥接

```
┌─── Mac mini (你的新家) ──────┐
│                                │
│  Hermes Agent ──stdio──▶ Bridge Server (HTTP :9090)
│       ▲                          │
│       │                          │ SSH tunnel
│   Telegram 网关                  │
└───────┼──────────────────────────┼───┘
        │                          │
   手机指令                  ┌──────▼──────────┐
                            │ StockMan 工控机   │
                            │ (Windows Server) │
                            └─────────────────┘
```

On the Mac: `node bridge.mjs --http :9090`
On the remote: `ssh -L 9090:localhost:9090 mac-mini` → Hermes calls `localhost:9090`

