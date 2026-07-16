# CLAUDE.md — hermes-claude-bridge

## Build
```bash
npm install
npm run build          # → dist/bridge.mjs
```

## Test
```bash
node dist/bridge.mjs --help   # 验证编译成功
```

## Commit
- 功能分支: `dev_xxx_日期`
- 每批 ≤ 5 文件
- format 最后一步
- PR → review → merge

## 目录结构
```
src/                  bridge 源码 (29 + 7 恢复文件)
claude-code-deps/     Claude Code 依赖 (40+ stub)
dist/                 esbuild 输出
```

## 依赖更新规则
- `claude-code-deps/` 文件坏了 → 修 stub
- 不改 `src/` 里的 bridge 核心逻辑（从 Open-ClaudeCode 分离的原始代码）
- 认证绕过在 7 个恢复文件中处理

## 禁止
- ❌ 不建新 repo
- ❌ 不自己 merge 到 main
- ❌ 不加回从 submodule 删掉的认证文件
