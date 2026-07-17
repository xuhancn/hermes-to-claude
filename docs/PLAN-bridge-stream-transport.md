# Hermes-Claude-Bridge 桥接流传输重构计划

> 分析日期：2026-07-18
> 分析来源：open-claude-code (Claude Code 官方开源实现)

---

## 一、当前状态 — 问题诊断

现有 `src/hbridge/bridge.mjs` 本质是一个**极薄的 "进程管理器"**：

```
HTTP POST /task/create → stdin JSON → 解析 stdout NDJSON → HTTP response
```

**缺失的关键能力：**

| 能力 | 官方实现 | 当前 |
|------|---------|------|
| 可靠流传输 | SerialBatchEventUploader + 指数退避重试 | `child.stdout.on("data")` 裸读 |
| 消息批处理 | 100ms 延迟缓冲 + 单 inflight POST | 逐行解析，无批处理 |
| 分布式去重 | BoundedUUIDSet (2000-cap 环缓冲) | 无 |
| 连接生命周期 | 自动重连 (10min budget) + 保活探活 | 无 — 子进程退出即报错 |
| 写入反压 | maxQueueSize 阻塞 enqueue | 无限 + 无信号 |
| SSE 序列号 | from_sequence_num 断点续传 | 无 |
| 写入门控 | FlushGate 保证历史→新消息有序 | 无 |
| 控制协议 | initialize/interrupt/set_model 等双向控制 | 无 |

---

## 二、官方架构鸟瞰

官方完整的桥接流传输调用链分解为 **4 层抽象**：

```
┌──────────────────────────────────────────────────────────────────┐
│  第 1 层: 桥接入口 (bridgeMain.ts / initReplBridge.ts)           │
│  ● 环境注册 → 轮询工作项 → decode JWT → 获取 ingress token       │
│  ● 或直接 POST /v1/code/sessions → /bridge (env-less 路径)       │
├──────────────────────────────────────────────────────────────────┤
│  第 2 层: 统一传输抽象 (ReplBridgeTransport)                      │
│  ├─ createV1ReplTransport()  → HybridTransport                    │
│  │   读：WebSocket  |  写：POST (SerialBatchEventUploader)        │
│  └─ createV2ReplTransport()  → SSETransport + CCRClient           │
│      读：SSE fetch()  |  写：POST /worker/events (CCRClient)      │
├──────────────────────────────────────────────────────────────────┤
│  第 3 层: 序列化批处理上传器 (SerialBatchEventUploader)           │
│  ● 有序入队 → 最多 1 个 POST 在途                                │
│  ● 最大 500 条/批                                                  │
│  ● 指数退避(500ms→8s) + 抖动(±1s)                                │
│  ● maxConsecutiveFailures 可配 → 丢批跳过的兜底                   │
│  ● enqueue() 在 maxQueueSize 时阻塞 → 背压                        │
├──────────────────────────────────────────────────────────────────┤
│  第 4 层: 消息处理管道 (bridgeMessaging.ts)                       │
│  ● handleIngressMessage: 解析 → UUID 回声过滤 → 路由             │
│    ├→ user messages → onInboundMessage                            │
│    ├→ control_response → onPermissionResponse                     │
│    └→ control_request → handleServerControlRequest                │
│  ● BoundedUUIDSet: 环缓冲去重 (echo + re-delivery)                │
│  ● FlushGate: 初始历史刷新期间排队实时写入                        │
│  ● onUserMessage: 从消息流中提取标题文本                          │
└──────────────────────────────────────────────────────────────────┘
```

---

## 三、核心调用链详解（onWorkReceived → 数据传输）

以 **v2 (CCR v2)** 协议为例（官方最新首选路径）：

### 初始化连接

```
onWorkReceived(workSessionId, ingressToken, workId, useCcrV2)
  │
  ├─ 记录 currentWorkId + currentIngressToken (heartbeat 用)
  │
  ├─ 关闭旧传输 (如有)
  │   └─ getLastSequenceNum() → lastTransportSequenceNum 保存断点
  │
  ├─ v1 分支: new HybridTransport(wsUrl, ...)
  │     .write() / .writeBatch() → SerialBatchEventUploader → POST
  │     .connect() → WebSocketTransport.connect() → WS 读流
  │
  └─ v2 分支: await createV2ReplTransport({sessionUrl, ingressToken, sessionId, ...})
        ├─ registerWorker(sessionUrl, ingressToken) → POST /register → {worker_epoch}
        ├─ new SSETransport(sseUrl, ..., initialSequenceNum)
        │   └─ connect() → fetch(sseUrl).body.getReader() → SSE 读流
        └─ new CCRClient(sse, sessionUrl, ...)
              └─ initialize(epoch) → PUT /worker + 启动 heartbeat
```

### 数据传输路径

```
写入 (outbound — 本地 → 远程):
  writeMessages(Message[]) / writeSdkMessages(SDKMessage[])
    │
    ├─ isEligibleBridgeMessage() 过滤 (user/assistant/system+command)
    ├─ BoundedUUIDSet.has() 去重 (回声过滤)
    ├─ FlushGate.enqueue() → 历史刷新期间排队
    │
    ├─ toSDKMessages() 转换 → { type, subtype, message, ... }
    │
    └─ transport.writeBatch(events)
        │
        ├─ (v1) HybridTransport.writeBatch()
        │   └─ SerialBatchEventUploader.enqueue()
        │       └─ postOnce() → HTTP POST {events: [...]}
        │
        └─ (v2) CCRClient.writeEvent(m)
            └─ SerialBatchEventUploader.enqueue([m])
                └─ postOnce() → HTTP POST /worker/events

读取 (inbound — 远程 → 本地):
  (v1) WS onmessage → setOnData callback
  (v2) SSE readStream → handleSSEFrame() → onData(payload)
  │
  └─ handleIngressMessage(data, ..., onInboundMessage, ...)
       │
       ├─ control_response → onPermissionResponse
       ├─ control_request → handleServerControlRequest()
       └─ user message → onInboundMessage
```

### 生命周期管理

```
Teardown (非永久模式):
  sendResult() → transport.write(makeResultMessage())
  Promise.all([stopWork(), archiveSession()])
  transport.close()
  deregisterEnvironment()

自动重连:
  WebSocketTransport 10min budget:
    exponential backoff 1s→30s + 25% jitter
    sleep/wake 检测: >60s 间隔 → 重置 budget
    4003 (unauthorized) → refreshHeaders 尝试

  SSETransport 10min budget (同上)
    From_Sequence_Num / Last-Event-ID 续传
```

---

## 四、关键设计模式总结

### 1. 序列化 + 批处理 (SerialBatchEventUploader)

```
                    ┌──────────────┐
  enqueue([items]) →│ pending buffer│→ drain() → send(batch)
                    └──────────────┘      │           │
                         ▲                │           ▼ 成功
                    flush() 等待    ┌──────┴─────┐
                    直到空         │ exponential │→ 重试
                                   │  backoff    │
                                   └──────┬─────┘
                                          │ maxConsecutiveFailures
                                          ▼ 丢批跳过
```

### 2. 双去重策略
- **主去重**: Hook 的 lastWrittenIndexRef (基于索引比较)
- **次级去重**: BoundedUUIDSet (环缓冲，容量 2000)

### 3. SSE 断点续传

```
新传输 connect() → URL?from_sequence_num=4200 + Header Last-Event-ID: 4200
服务端仅发送 seq > 4200 的事件
```

### 4. FlushGate (写入门控)

```
首次 connect():
  flushGate.start()          → 实时写入排队
  transport.writeBatch(history) → POST 历史
  .finally()                 → drainFlushGate → 转发排队消息 → 'connected'
```

---

## 五、重构计划（三阶段）

### 阶段 1 — 核心传输基础设施（第 1 次 PR，约 2-3 天）

**目标：** 建立统一 Transport 接口 + 移植 SerialBatchEventUploader

```
src/hbridge/
├── transport/
│   ├── types.mjs                   # Transport 接口 + 核心类型
│   ├── SerialBatchEventUploader.mjs # 有序、批处理、重试上传器
│   └── StdioTransport.mjs          # 包装 child stdio 为 Transport 接口
├── bridgeMessaging.mjs             # BoundedUUIDSet + handleIngressMessage
└── bridge.mjs                      # [修改] 接入 Transport 接口
```

### 阶段 2 — 消息管道 + 会话管理（第 2 次 PR，约 2-3 天）

**目标：** 双向消息路由 / 多会话 / 生命周期

1. 移植完整的 handleIngressMessage + FlushGate
2. Session 类管理独立上下文
3. Bridge 管理 Session 池（非单进程）
4. 历史刷新流程接入 FlushGate

### 阶段 3 — 重连 + 分布式支持（第 3 次 PR，约 2-3 天）

**目标：** 容错、心跳、远程协议支持

1. 指数退避重连策略
2. SSE 序列号断点续传
3. Liveness check (10s ping / 45s timeout)
4. v2 (CCR) 远程连接
5. FlushGate 保证历史→实时有序

### 架构原则

```
单方向数据流:
  消息源 → filter → dedup → convert → batch → send

错误隔离:
  传输失败 → onClose → 桥接层决策：重连 vs 报错
  单会话 crash → 不影响其他会话
  批次上传失败 → 指数退避单独重试该批次

进程边界:
  跨进程通信始终经过 Transport 接口
  不同 Transport 实现可互换（stdio / WS / SSE）
```
