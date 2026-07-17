# hbridge Local Mode — Design

Hermes + Claude 本地零配置协作模式。

## 触发

```bash
HBRIDGE_LOCAL=1 node dist/hbridge.mjs --stdio
```

或写入 `~/.claude.json`：

```json
{
  "mcpServers": {
    "hbridge": {
      "command": "node",
      "args": ["path/to/dist/hbridge.mjs", "--stdio"],
      "env": { "HBRIDGE_LOCAL": "1" }
    }
  }
}
```

## 行为

| 模式 | 认证 | 端口 | 生命周期 |
|------|------|------|----------|
| remote | 需要 Basic Auth | 固定 9190 | 手动 enable/disable |
| **local** | **免认证** | **hash(cwd)** | **Claude 启动即开，退出即关** |

## 端口映射

```
port = 9200 + (md5(cwd)[0:2] % 600)
```

| 工作目录 | MD5 首 2 字节 | 端口 |
|----------|--------------|------|
| `~/tasks/pre-market-recap/` | `a3f2` | port 9268 |
| `~/tasks/post-market-recap/` | `d81e` | port 9518 |
| `~/pytorch/` | `5c0e` | port 9321 |

**Hermes 侧计算相同的 port**，直连 `http://localhost:<port>/v1/task/create`。

## 多任务并行

每个 Claude 实例绑定一个工作目录 → 独立端口 → 互不冲突：

```
目录 A → port 9268 → Claude A → 做盘前复盘
目录 B → port 9518 → Claude B → 做 PyTorch build
```

## Hermes 连接流程

```python
import hashlib

def hbridge_port(cwd):
    h = hashlib.md5(cwd.encode()).digest()
    return 9200 + ((h[0] << 8 | h[1]) % 600)

# 发送任务
port = hbridge_port("/home/xu/tasks/pre-market-recap")
requests.post(f"http://localhost:{port}/v1/task/create",
              json={"prompt": "盘前分析"})
```

## API

与 remote 模式完全一致：

- `GET /health` → `{"status":"ok"}`
- `POST /v1/task/create` → `{"task_id":"...","status":"created"}`
- `GET /v1/task/output?task_id=...` → `{"task":{"status":"done","result":"..."}}`

## 目录约定

任务目录结构 (见 [hermes-agent-everything](https://github.com/xuhancn/hermes-agent-everything))：

```
tasks/<task-name>/
  CLAUDE.md    ← Claude 启动时加载
  skills/      ← 任务专用 skills
  scripts/     ← 任务专用脚本
```

## 状态

**设计阶段** — 待实施。
