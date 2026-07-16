# Optimization Ideas

Rough edges in the current codebase, ranked by impact.

## 🔴 High

### 1. test_setup_mcp.mjs broken on Windows
`tests/test_setup_mcp.mjs` uses `/tmp/test_claude_config_mcp` (Linux path) and expects `claude_desktop_config.json` format, but `setup-mcp.cjs` writes to `~/.claude.json`. The test is stale.

### 2. bridge.mjs getTaskOutput() reads from memory, not inbox
`getTaskOutput(taskId)` returns from in-memory `this.tasks` Map. If the process restarts, results are lost. The MCP HTTP server reads from inbox correctly, but `bridge.mjs`'s own method doesn't. Two code paths, inconsistent.

**Fix:** `getTaskOutput()` falls back to `readInbox()` if task not in memory.

### 3. Sequential execution, no queue
`createTask()` spawns immediately regardless of whether a previous task is still running. If Hermes sends 5 tasks, 5 Claude processes fight for resources. No queue, no concurrency limit.

## 🟡 Medium

### 4. No task timeout
If Claude --print hangs (network issue, infinite loop), the task stays "running" forever. inbox never gets result, statusLine shows 📨 forever.

**Fix:** `_spawn()` sets a timeout (e.g. 5 min), `kill()` on expiry, updates inbox to "failed".

### 5. Orphaned processes on shutdown
When hbridge stops (disable/exit), running Claude --print child processes are orphaned. They keep running in the background.

**Fix:** Track child PIDs, kill on process exit.

### 6. Chat log no rotation
`~/.hbridge_chat.log` grows indefinitely. No max size, no rotation.

**Fix:** Truncate to last N lines on each write, or rotate at 1MB.

### 7. hbridge_inbox.json max 20 but no purge
`MAX_INBOX = 20` slices the array, but completed tasks accumulate. No cleanup of old done tasks.

**Fix:** Auto-purge done tasks older than 24h on write.

## 🟢 Low

### 8. statusLine +N more is vague
`+2 more` doesn't tell the user what those tasks are. Could show exit code summary: `+2 ✅`.

### 9. Status icons limited
📨 running / ✅ exit:0 / ❌ failed. But no partial/failure detail in status bar.

### 10. No health endpoint on legacy server.mjs
If CLI path (`--enable`) is used instead of MCP, the server.mjs HTTP server handles health, but doesn't have the inbox-based task/output endpoint. Two diverging implementations.

### 11. Auth base64 parsing fragile
`Buffer.from(b64, "base64").toString().split(":")` breaks if key or username contains `:`.
