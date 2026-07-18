# CLAUDE.md — hermes-claude-connector

## 铁律 — 增量修改 only
- 每个 PR 必须有详细 Description: 改了什么、为什么、怎么验证
- PR 提交前必须本地 build + test 通过
- 禁止 PR 包含 node_modules/ 或构建产物
- 功能分支 → PR → review → merge，禁止直接推 main

## Build
npm install && npm run build

## Test
- `node tests/test_bridge.mjs` — Bridge pool unit tests (46 assertions)
- `node tests/test_e2e.mjs` — Full integration test w/ mock child (49 assertions)
- `node src/hbridge/transport/__tests__/run-all.mjs` — Transport layer tests (149 assertions)
- `node tests/test_persistence.mjs` — Task persistence tests (22 assertions)
- `node tests/test_cli.mjs` — CLI argument parsing tests (12 assertions)
- `for f in tests/test_*.mjs; do node "$f"; done` — Run all test files
- `curl http://127.0.0.1:9761/health` → `{"status":"ok"}`
- `curl -X POST http://127.0.0.1:9761/v1/task/create -d '{"prompt":"hi"}'` → `{"task_id":"...","status":"created"}`

## Commit
- 每批 ≤ 5 文件
- commit message 英文简述

## 禁止
- ❌ 不推倒重来 (no revert-then-rewrite)
- ✅ 增量修改 (delta changes only — edit lines, don't replace files)
- ✅ 出问题回退到正确版本，保留正确部分
- ❌ 不建新 repo
- ❌ 不直接推 main
- ❌ PR 不写 description
- ❌ 提交 node_modules
