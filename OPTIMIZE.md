# Optimization Ideas

Current state after persistent Claude process + JSON-RPC refactor.

## 🟡 Medium

### 1. Sequential queue blocks new tasks
`createTask()` polls `setInterval` until previous task finishes. No parallelism.
**Fix:** Use proper promise queue (e.g. p-queue) instead of busy-poll.

### 2. No task timeout
If Claude --print hangs, task stays "running" forever, next task never starts.
**Fix:** `_finishTask` timeout (e.g. 5 min) → kill and restart Claude process.

### 3. StatusLine only shows on/off
No task info in bottom bar. User asked for "format A" earlier.
**Fix:** Expose current task info via state.mjs, statusline reads it.

### 4. State file not cleaned up
`~/.hbridge_state.json` stays as `running: false` after disable. No auto-cleanup.
**Fix:** Delete state file on disable.

## 🟢 Low

### 5. Auth base64 parsing fragile
`Buffer.from(b64,"base64").toString().split(":")` breaks if key contains `:`.
**Fix:** Use lastIndexOf(":") to split username from key.

### 6. test_bridge.mjs needs update
Tests Bridge instance methods but new Bridge auto-spawns Claude on construction.
**Fix:** Make Claude spawn lazy (on first createTask).

### 7. No Claude process health check
If child Claude process crashes, Bridge auto-restarts it on next createTask. But if it crashes repeatedly, no backoff.
**Fix:** Add restart limit + exponential backoff.

### 8. hbridge_state.json writes synchronously
`writeFileSync` blocks the event loop on every state update. Low impact but unnecessary.
**Fix:** Use `writeFile` (async) for state writes.

## ✅ Resolved in v0.3

| Item | Status |
|------|--------|
| Inbox persistence | Removed (no files) |
| Chat log | Removed |
| EADDRINUSE race | Resolved (single HTTP server) |
| Spawn -p escaping | Resolved (JSON-RPC stdin) |
| Cold start per task | Resolved (persistent process) |
| 3-failure liveness debounce | Removed (simple on/off) |
