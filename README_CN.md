# Hermes-to-Claude (h2c) — 中文文档

**Hermes-Agent** 通过 HTTP 控制多台 **Claude Code** 实例 —— 一个 agent， 多个 Claude worker。**无需 Pro/Max 订阅**。

```
📱 User ----HTTP----> 🤖 Hermes-Agent ----h2c----> 🏭 Claude Code (部署)
                            ├───h2c───> 🔧 Claude Code (编码)
                            ├───h2c───> 🧪 Claude Code (测试)
                            └───h2c───> 🔬 Claude Code (构建)
```

---

## 1. h2c 优势

- **无需 Pro/Max 订阅**：通过 stdio 连接任何 Claude Code
- **一个 Agent，多个 Claude**：一台 Hermes-Agent 将任务分派到多台 Claude Code 实例
- **默认关闭，安全优先**：只有显式执行 `h2c enable` 才开放端口
- **跨平台**：Windows / Linux / macOS
- **纯本地**：不上云，无外部 API

---

## 2. 人类用户使用指南

### 准备工作

h2c 需要 **Node.js ≥ 20**。

| 平台 | 安装命令 |
|------|----------|
| Linux (Ubuntu/Debian) | `sudo apt install nodejs npm` |
| macOS | `brew install node` |
| Windows | `winget install OpenJS.NodeJS` |

### 普通用户安装

一行命令全局安装：

```bash
npm install -g hermes-to-claude
```

### 开发者安装

```bash
git clone https://github.com/xuhancn/hermes-to-claude.git
cd hermes-to-claude
npm install && npm run build
```

### 在 Claude Code 中启动

```
/h2c enable
/h2c status
```

### Home 模式 — 无显示器机器

```bash
# Linux / macOS
H2C_HOME=1

# Windows (Command Prompt)
set H2C_HOME=1

# Windows (PowerShell)
$env:H2C_HOME = "1"
```

### 认证与端口

端口 = `9200 + MD5(cwd)`。每个项目目录独立端口。密钥为 `h2c_` + 8 位 base52 字符。HTTP Basic Auth（用户名 `bridge`）。

---

## 3. Hermes-Agent 接入指南

配置文件 `~/.hermes/config.yaml`：

```yaml
# 单机
h2c:
  project: my-app
  cwd: /path/to/project
  host: <ip>
  port: <port>
  key: h2c_XXXXXXXX

# 多机农场
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
```

### 创建任务

```bash
curl -X POST http://<host>:<port>/v1/task/create \
  -H "Authorization: Basic <base64(bridge:key)>" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "fix the off-by-one bug in main.c"}'
```

### 获取结果

```bash
curl "http://<host>:<port>/v1/task/output?task_id=task_xxx" \
  -H "Authorization: Basic <base64(bridge:key)>"
```

### SSE 实时流

```bash
curl -N "http://<host>:<port>/v1/task/output/stream?task_id=task_xxx" \
  -H "Authorization: Basic <base64(bridge:key)>"
```

---

## API 端点

| 端点 | 认证 | 说明 |
|------|------|------|
| `GET /health` | 无 | 健康检查 |
| `POST /v1/task/create` | Basic Auth | 创建任务 |
| `GET /v1/task/output?task_id=` | Basic Auth | 获取结果 |
| `GET /v1/task/output/stream?task_id=` | Basic Auth | SSE 实时流 |
| `POST /v1/task/cancel` | Basic Auth | 取消任务 |

---

## License

MIT · Xu Han · [github.com/xuhancn/hermes-to-claude](https://github.com/xuhancn/hermes-to-claude)
