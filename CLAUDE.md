# CLAUDE.md — hermes-claude-bridge

## Build
```bash
npm install
npm run build          # → dist/bridge.mjs
```

## Test
```bash
node dist/bridge.mjs --help
```

## 开发铁律

### Branch
- 功能分支: `dev_功能名_日期` (如 `dev_bridge_auth_0716`)
- 分支名必须全英文, 禁止中文
- 从 main 拉分支 → 开发 → PR → review → merge

### Commit
- 每批 ≤ 5 文件, 原子变更
- format 最后一步
- commit message 用英文, 简述改动

### Review
- PR 创建后等待 review
- ❌ AI 不自行 merge
- ❌ AI 不直接推 main
- ✅ 用户审批后 merge

### 目录
- ❌ 不建新 repo
- ❌ 不删现有文件(只标记 deprecated)
- ❌ 不加回已删除的认证文件

### 依赖
- `claude-code-deps/` stub 坏了 → 修 stub
- 不改 `src/` 核心逻辑(从 Open-ClaudeCode 分离的原始代码)

### 通用
- 只加不减, 控制变量
- 回退到正确版本再叠加
- 记忆是累积(GET)不是替换(SET)
