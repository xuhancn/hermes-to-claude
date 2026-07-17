# Optimization Ideas

Current state after PR #14 fixes (persistent Claude process + correct NDJSON format).

## 🟡 Medium

### 1. Sequential queue busy-polls
`createTask` polls `setInterval` until previous task finishes.
**Fix:** Use proper promise queue (p-queue pattern) instead of busy-poll.

### 2. Task timeout kills queue
5-min timeout marks task failed and advances queue. But subsequent tasks
may depend on the failed one.
**Fix:** Let caller decide timeout behavior (or disable timeout entirely).

### 3. No Claude process health check
If Claude process crashes, Bridge auto-restarts (up to 3 times). But
no alert to user.
**Fix:** Write crash count to state file, statusLine shows it.

### 4. StatusLine only shows latest task
If tasks queue up, only the current/running task is visible.
**Fix:** Expose queue depth in state file.

## 🟢 Low

### 5. State file writes synchronously
`writeFileSync` blocks on every state update.
**Fix:** Use `writeFile` (async) for non-critical state writes.

### 6. Auth base64 fragile
`Buffer.from(b64,"base64").toString().split(":")` breaks if key contains `:`.
**Fix:** Use `lastIndexOf(":")` to split username from key.

### 7. test_setup_mcp.mjs stale
Uses `/tmp/` paths (Linux) and old config format.
**Fix:** Update test or remove it.

## ✅ Resolved

| Item | PR/Commit |
|------|-----------|
| Missing `\n` in stdin NDJSON | PR #14 |
| Missing `--verbose` flag | PR #14 |
| Wrong stdin message format | PR #14 |
| Wrong completion detection | PR #14 |
| Inbox persistence (removed) | v0.3 |
| Spawn -p escaping (fixed) | v0.3 |
| EADDRINUSE crash (fixed) | v0.3 |
| StatusLine task info (restored) | v0.3 |
