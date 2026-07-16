# CLAUDE.md — hermes-claude-bridge

## 铁律 — 增量修改 only
- 每个 PR 必须有详细 Description: 改了什么、为什么、怎么验证
- PR 提交前必须本地 build + test 通过
- 禁止 PR 包含 node_modules/ 或构建产物
- 功能分支 → PR → review → merge，禁止直接推 main

## Build
npm install && npm run build

## Test
- src/hbridge/cli.mjs --enable xu → verify startup + key generation
- curl health → {"status":"ok"}
- curl task/create → {task_id: "..."}

## Commit
- 每批 ≤ 5 文件
- commit message 英文简述

## 禁止
- ❌ 不推倒重来 (no revert-then-rewrite)
- ✅ 增量修改 (delta changes only — edit lines, don"t replace files)
- ✅ 出问题回退到正确版本，保留正确部分
- ❌ 不建新 repo
- ❌ 不直接推 main
- ❌ PR 不写 description
- ❌ 提交 node_modules
