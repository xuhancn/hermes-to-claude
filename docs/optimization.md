# Known Issues

### 1. Sequential queue busy-polls

`createTask` polls `setInterval` until previous task finishes.

**Potential fix:** Use proper promise queue (p-queue pattern) instead of busy-poll.

### 2. Task timeout kills queue

5-minute timeout marks task failed and advances queue, but subsequent tasks may depend on the failed one.

**Potential fix:** Let caller decide timeout behavior, or disable timeout entirely.
