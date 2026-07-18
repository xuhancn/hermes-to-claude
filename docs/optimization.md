# Known Issues (Resolved)

### ~~1. Sequential queue busy-polls~~ ✅ Fixed in #51

`createTask` previously polled `setInterval` until the previous task finished.

**Fix:** Bridge now uses a session pool (`_sessions: Map<taskId, Session>`) with a proper promise queue (`_pendingQueue`). No busy-polling — tasks at capacity are queued and automatically start when a slot opens.

### ~~2. Task timeout kills queue~~ ✅ Fixed in #52

The 5-minute hard timeout (`TASK_TIMEOUT_MS = 300_000`) could kill long-running tasks.

**Fix:** Timeout is now opt-in. Default is `0` (no timeout). Set `HBRIDGE_TASK_TIMEOUT_MS` env var or pass `taskTimeoutMs` to the Bridge/Session constructor to enable it.
