# hbridge Local Mode — Design

> **⚠️ EXPERIMENTAL** — 设计阶段，待实施。API 可能变动。

Hermes + Claude 本地零配置协作（OOB — Out-Of-Box）。区别于 remote 模式（需要手动 `enable` + 认证），local 模式**自动打开、免认证、随 Claude 生命周期自动启停**。

## 设计动机

通用 AI agent (Hermes) 记不住领域细节——经验锁在 skill 文件里。hbridge local mode 让 Hermes 只管调度，把 skill/脚本/工作流全部丢给 Claude 执行。Claude 专注一件事，无记忆污染。

```
Hermes → 算端口 → 连 localhost → 发 task + skill → 看结果
Claude → 读 CLAUDE.md → 加载 skill → 执行 → 返回
```

## 触发

Hermes 设置环境变量 `HBRIDGE_LOCAL=1`，hbridge 自动感知——零用户操作。不需要修改 MCP config，不需要 Claude 做任何事情。

```bash
HBRIDGE_LOCAL=1 node dist/hbridge.mjs --stdio
```

## 行为差异

| | remote 模式 | local 模式 |
|------|------------|-----------|
| 启动 | 手动 `enable hbridge` | **自动打开** |
| 认证 | Basic Auth 必须 | **免认证** (127.0.0.1) |
| 端口 | 固定 9190 | **hash(cwd)** |
| 生命周期 | 手动 disable | **Claude 退出即关** |

## 端口映射

```
port = 9200 + (md5(cwd)[0:2] % 600)
```

每个工作目录固定端口。Hermes 按同样算法算端口后直连。

## 实现要点

1. 检测 `HBRIDGE_LOCAL=1` → 自动启动 HTTP server（无需 `enable`）
2. 认证中间件：`if HBRIDGE_LOCAL` → skip auth
3. 端口 = hash(cwd)，不固定 9190
4. `process.on("exit")` → 自动关 server

## API

与 remote 完全一致 — 只是免 auth 端口不同。

## 状态

**设计阶段** — 未实施。
