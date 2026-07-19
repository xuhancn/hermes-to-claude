# Hermes-to-Claude (h2c) — 中文文档


[English](README.md)
**Hermes-Agent** 通过 HTTP 控制多台 **Claude Code** 实例 —— 一个 agent， 多个 Claude worker。**无需 Pro/Max 订阅**。

```
📱 User ----HTTP----> 🤖 Hermes-Agent ----h2c----> 🏭 Claude Code (部署角色)
                            ├───h2c───> 🔧 Claude Code (编码角色)
                            ├───h2c───> 🧪 Claude Code (测试角色)
                            └───h2c───> 🔬 Claude Code (构建角色)
```

[English](README.md)

---

## 1. h2c 优势

- **无需 Pro/Max 订阅** — 通过 stdio 连接任何 Claude Code；不需要 Anthropic 订阅。
- **一个 Agent，多个 Claude** — 一台 Hermes-Agent 将任务路由到多台 Claude Code 实例，每个实例在自己的项目目录中运行，拥有独立的 CLAUDE.md 和 skills。
- **默认关闭，安全至上** — 只有你显式执行 `h2c enable` 时才开放端口。认证密钥保护所有端点。
- **跨平台** — Windows / Linux / macOS。单一代码库。
- **纯本地** — 不上云，无外部 API。完全离线。

---

## 2. 人类用户使用指南

### 准备工作

h2c 需要 **Node.js ≥ 20**。根据你的平台安装：

| 平台 | 命令 |
|------|------|
| Linux (Ubuntu/Debian) | `sudo apt install nodejs npm` |
| macOS | `brew install node` |
| Windows | `winget install OpenJS.NodeJS` 或从 https://nodejs.org 下载 |

### 普通用户安装

一行命令全局安装：

```bash
npm install -g hermes-to-claude
```

这会在系统全局安装 `h2c` 命令。

### 开发者安装

适合想要修改 h2c 源码的贡献者：

```bash
git clone https://github.com/xuhancn/hermes-to-claude.git
cd hermes-to-claude
npm install && npm run build
```

### 在 Claude Code 中启动

安装完成后，在 Claude Code 内部启用 h2c：

```
/h2c enable
```

这会启动 HTTP 服务器。端口从工作目录派生而来（见下方「认证与端口」）。随时查看状态：

```
/h2c status
```

### Home 模式 — 无界面机器

当 Hermes-Agent 在无显示器的服务器上运行时，设置 **环境变量** `H2C_HOME=1`：

```bash
# Linux / macOS
H2C_HOME=1

# Windows (Command Prompt)
set H2C_HOME=1

# Windows (PowerShell)
$env:H2C_HOME = "1"
```

Home 模式下服务器仅监听 `127.0.0.1`，**无需认证** — 只有本机进程能访问，安全无忧。

### 认证与端口

端口由工作目录**确定**：`MD5(cwd)` → 前 2 字节 → `9200 + (值 % 600)`。每个项目目录有独立端口。这是故意的设计：

- 每个 Claude Code 实例在自己的工作目录中运行
- Claude 从该目录读取自己的 CLAUDE.md、skills 和项目文件
- 端口 = 项目 — 你永远知道正在与哪个 Claude 通信

认证密钥（`h2c_` + 8 个随机 base52 字符）写入 `~/.h2c_key`，同一机器上所有目录复用。除 `/health` 外，所有 HTTP 端点都需要 HTTP Basic Auth（用户名 `bridge`，密码为密钥）。

---

## 3. Hermes-Agent 接入指南

Hermes-Agent 通过 HTTP 发现并控制 h2c。以下是完整 API。

### 连接 Hermes-Agent

给 Hermes-Agent 提供端口和密钥。添加到 `~/.hermes/config.yaml`：

```yaml
# 单台 h2c 实例
h2c:
  project: my-app
  cwd: /path/to/project
  host: <ip>
  port: <port>
  key: h2c_XXXXXXXX

# 多台机器（10 台 h2c 农场）：
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

Hermes-Agent 读取配置并根据项目将任务分派到正确的机器。参考下方 API 参考。

### 安全

与 Claude Code CLI 一样，h2c 对所有可变更端点要求认证。但 Hermes-Agent 可以简化流程 — 要么自己处理认证流程，要么通过 `skip_permissions` 为可信任务完全跳过。Hermes-Agent 必须像人类用户一样处理相同的认证和权限流程，或明确选择跳过。

### 创建任务

启动一个 Claude Code 会话。对开发任务设置 `skip_permissions: true` 可跳过工具审批提示：

```bash
curl -X POST http://<host>:<port>/v1/task/create \
  -H "Authorization: Basic <base64(bridge:key)>" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "修复 main.c 中的 off-by-one 错误"}'
# → {"task_id":"task_xxx","status":"created"}
```

| 可选字段 | 类型 | 说明 |
|----------|------|------|
| `permission_mode` | `"approve"` (默认) 或 `"bypass"` | 工具审批行为 |
| `skip_permissions` | `boolean` | 跳过所有权限提示 |
| `cwd` | string | Claude 会话的工作目录 |
| `sessionId` | string | 复用已有的 Claude 会话 |

### 健康检查

无需认证：

```bash
curl http://<host>:<port>/health
# → {"status":"ok"}
```

### 获取任务输出

轮询直到 `status` 为 `"done"` 或 `"failed"`。长任务（代码生成、测试套件）可能需要数分钟：

```bash
curl "http://<host>:<port>/v1/task/output?task_id=task_xxx" \
  -H "Authorization: Basic <base64(bridge:key)>"
# → {"retrieval_status":"success","task":{"status":"done","result":"已修复。","exitCode":0}}
```

### 取消任务

```bash
curl -X POST http://<host>:<port>/v1/task/cancel \
  -H "Authorization: Basic <base64(bridge:key)>" \
  -H "Content-Type: application/json" \
  -d '{"task_id":"task_xxx"}'
```

### 权限管道

h2c 包含完整的权限管道 — 就像 Claude Code CLI 本身一样。Hermes-Agent 可以按任务决定如何处理工具审批：

| 模式 | 行为 |
|------|------|
| `approve` (默认) | Claude 发送 `control_request` → Hermes 决定允许/拒绝 |
| `bypass` | Claude 发送请求但不阻塞；Hermes 可记录审计日志 |
| `skip_permissions` | `--dangerously-skip-permissions` — 不发送任何请求，最大速度 |

日常开发任务使用 `skip_permissions`。需要审计追踪的生产任务保持默认 `approve` 模式。Hermes-Agent 还可以通过 `updatedInput` 响应，在 Claude 执行前修改工具参数。

### 架构

```
Hermes ──HTTP──▶ h2c :<port> ──spawn──▶ Session (Claude Code)
  │                   │                              │
  │  控制层           │  server.mjs (HTTP 路由)        │  读取 CLAUDE.md
  │  (create/cancel/  │  bridge.mjs (session 池)       │  加载 skills
  │   output/poll)    │  session.mjs (每任务进程)       │  编辑文件
  │                   │                              │
  │  传输层           │  StdioTransport                │
  │  (SSE 流式)       │  (NDJSON stdin/stdout 管道)    │  Claude stdout
  │                   │                              │
  └─ 轮询或 SSE ◀─────┴─ 任务输出 (status/result) ────┘
```

Hermes-Agent 通过两层调度任务：

- **控制层**：HTTP 端点管理任务生命周期 — 创建、取消、轮询结果、健康检查。见上文各节。
- **传输层**：通过 SSE 和 NDJSON 实现流式传输、实时进度和持久化记录。下文详述。

Claude Code 以每任务子进程的形式，从工作目录加载项目专属的 CLAUDE.md 和 skills。每个 session 相互隔离。

### 传输层

除了轮询 `getTaskOutput`，Hermes-Agent 还可以通过 Server-Sent Events (SSE) 接收**实时流式输出**，并读取原始的 Claude Code NDJSON 记录：

#### SSE 流式传输

订阅任务的输出流，实时获取事件 — 无需轮询：

```bash
curl -N "http://<host>:<port>/v1/task/output/stream?task_id=task_xxx" \
  -H "Authorization: Basic <base64(bridge:key)>"
# event: chunk
# data: {"task_id":"task_xxx","chunk":"正在修复 off-by-one...\n"}
#
# event: done
# data: {"task_id":"task_xxx","status":"done","exitCode":0}
```

SSE 推送的事件类型：

| 事件 | 说明 |
|------|------|
| `chunk` | Claude Code 的增量文本输出 |
| `status` | 任务状态变更 (running → done / failed) |
| `tool_progress` | 工具执行进度 (工具名 + 耗时) |
| `permission_request` | Claude 请求工具审批 (`approve` 模式下) |

#### NDJSON 记录

Claude Code 原始 stdout 保存至 `~/.h2c_transcript.jsonl`。每行为一条完整的 NDJSON 消息 — `assistant` 消息、`stream_event` 增量、`tool_use` 块以及带 usage 数据的 `result` 消息：

```jsonl
{"type":"stream_event","event":{"type":"content_block_delta","delta":{"type":"text_delta","text":"正在"}}}
{"type":"stream_event","event":{"type":"content_block_delta","delta":{"type":"text_delta","text":" 修复"}}}
{"type":"assistant","message":{"content":[{"type":"text","text":"已修复 off-by-one 错误。"}]}}
{"type":"result","subtype":"success","result":"...","usage":{"input_tokens":120,"output_tokens":45}}
```

Hermes-Agent 可以 tail 该文件获取完整的 Claude Code 会话历史，或消费 SSE 流获取实时更新。传输层确保无输出遗漏 — 即使 HTTP 连接断开，记录文件也保留每条消息。

---

### 参考文档

| 文档 | 内容 |
|------|------|
| [DESIGN.md](DESIGN.md) | 架构、协议、session 生命周期、权限管道、API 参考、更新日志 |
| [docs/local-mode.md](docs/local-mode.md) | H2C_HOME 自动启动模式 |
| [docs/spawn-mechanism.md](docs/spawn-mechanism.md) | Claude Code spawn 协议、NDJSON 格式 |
| [docs/mcp-spec.md](docs/mcp-spec.md) | MCP 工具定义 (Claude Code 集成) |

---

## License

MIT

Created by **Xu Han** — [github.com/xuhancn](https://github.com/xuhancn)
