# CLAUDE.md — hermes-claude-bridge

## PR 铁律
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
- ❌ 不建新 repo
- ❌ 不直接推 main
- ❌ PR 不写 description
- ❌ 提交 node_modules
