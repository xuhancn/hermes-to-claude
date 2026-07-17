/**
 * Bridge — persistent Claude Code process manager with streaming transport.
 *
 * Spawns ONE Claude process with --print --input-format stream-json
 * --output-format stream-json. Uses StdioTransport for reliable,
 * ordered I/O with batching and backpressure.
 *
 *   → {"role":"user","content":"fix bug"}
 *   ← {"type":"assistant","message":{"content":[{"type":"text","text":"..."}]}}
 *   ← {"type":"result","subtype":"success"}
 */

import { spawn } from "child_process";
import { randomUUID } from "crypto";
import { writeState } from "./state.mjs";
import { StdioTransport } from "./transport/StdioTransport.mjs";
import { BoundedUUIDSet } from "./bridgeMessaging.mjs";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CLAUDE_ARGS = [
  "@anthropic-ai/claude-code",
  "--print",
  "--input-format", "stream-json",
  "--output-format", "stream-json",
  "--verbose",
  "--dangerously-skip-permissions",
];

const TASK_TIMEOUT_MS = 300_000; // 5 min — kill stuck tasks

// ── Connection state machine ──────────────────────────────────────
const STATE = {
  IDLE: 'idle',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  RECONNECTING: 'reconnecting',
  FAILED: 'failed',
};

// ── Auto-reconnect (exponential backoff) ──────────────────────────
const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30_000;
const RECONNECT_GIVE_UP_MS = 600_000; // 10 min

// ── Keep-alive + liveness ─────────────────────────────────────────
const KEEPALIVE_INTERVAL_MS = 30_000;  // send keep_alive every 30s
const LIVENESS_TIMEOUT_MS = 120_000;   // treat as dead after 2min silence

export class Bridge {
  constructor() {
    this.child = null;
    this.busy = false;
    this.currentTask = null;
    this._results = new Map();
    this._taskResolve = null;

    // ── Connection state machine ──
    /** @type {'idle'|'connecting'|'connected'|'reconnecting'|'failed'} */
    this._state = STATE.IDLE;
    /** True when child has sent at least one JSON line (stdin writable check). */
    this._ready = false;

    // ── Transport layer ──
    /** @type {StdioTransport|null} */
    this.transport = null;
    /** Echo-dedup ring buffer for stdout messages. */
    this._recentUUIDs = new BoundedUUIDSet(2000);

    // ── Task streaming — Map<taskId, Set<{ write: (chunk: string) => void }>> ──
    /** @type {Map<string, Set<{ write: (data: string) => void }>>} */
    this._taskSubscribers = new Map();

    // ── Progressive streaming — track text per message.id ──
    /** @type {Map<string, { lastText: string }>} */
    this._msgTextProgress = new Map();

    // ── Session tracking ──
    /** @type {string|undefined} */
    this._sessionId = undefined;

    // ── Multi-turn auto-respond ──
    this._autoRespondCount = 0;
    this._maxAutoRespond = 5;

    // ── Auto-reconnect state ──
    /** @type {number} */
    this._reconnectAttempts = 0;
    /** @type {number|null} */
    this._reconnectStartTime = null;
    /** @type {NodeJS.Timeout|null} */
    this._reconnectTimer = null;

    // ── Keep-alive + liveness ──
    /** @type {number} */
    this._lastActivityTime = 0;
    /** @type {NodeJS.Timeout|null} */
    this._keepAliveTimer = null;
    /** @type {NodeJS.Timeout|null} */
    this._livenessTimer = null;
  }

  /**
   * Spawn Claude Code child process and connect transport.
   * Uses state machine — safe to call even if already connected.
   * @returns {Promise<boolean>} true if connected successfully
   */
  async _startClaude() {
    // Already connected — nothing to do
    if (this._state === STATE.CONNECTED && this.child && !this.child.killed) {
      return true;
    }
    // Another call is already spawning — wait for it
    if (this._state === STATE.CONNECTING) {
      while (this._state === STATE.CONNECTING) await sleep(200);
      return this._state === STATE.CONNECTED;
    }

    this._state = STATE.CONNECTING;
    this._ready = false;

    const isWin = process.platform === "win32";
    const cmd = isWin ? "cmd.exe" : "npx";
    const args = isWin ? ["/d", "/s", "/c", `npx.cmd ${CLAUDE_ARGS.join(" ")}`] : CLAUDE_ARGS;

    try {
      this.child = spawn(cmd, args, {
        stdio: ["pipe", "pipe", "pipe"],
        env: { ...process.env },
      });
    } catch (err) {
      process.stderr.write(`[bridge] spawn error: ${err.message}\n`);
      this._state = STATE.FAILED;
      return false;
    }

    // Create transport layer — wraps child stdin/stdout
    this.transport = new StdioTransport(this.child);

    // Wire inbound messages
    this.transport.setOnData((line) => {
      // Reset liveness timer on any data
      this._resetLiveness();
      try {
        const msg = JSON.parse(line);
        if (!this._ready) this._ready = true;
        this._onMessage(msg);
      } catch (e) {
        process.stderr.write(`[claude:stdout] parse error: ${e.message}\n`);
      }
    });

    this.transport.setOnClose((code) => {
      process.stderr.write(`[bridge] transport closed (code=${code})\n`);
      this._clearKeepAlive();
      this._clearLiveness();
      if (this._state === STATE.CONNECTED || this._state === STATE.CONNECTING) {
        this._failTask(`Claude process exited (code=${code})`);
        this._scheduleReconnect();
      }
    });

    // Start reading stdout
    this.transport.connect();

    // Claude Code only writes to stdout after receiving stdin,
    // so we cannot wait for stdout data as a ready signal.
    // The child is alive if spawn() didn't throw — mark ready immediately.
    this._ready = true;

    this._state = STATE.CONNECTED;
    this._resetReconnectState();
    this._ensureKeepAlive();
    this._resetLiveness();
    return true;
  }

  /**
   * Handle a parsed NDJSON message from Claude's stdout.
   * @param {Record<string,unknown>} msg
   */
  _onMessage(msg) {
    process.stderr.write(`[bridge:msg] role=${msg.role||msg.type||"?"} task=${!!this.currentTask}\n`);

    // UUID-based echo dedup (safety net — transport batching may replay)
    if (msg.uuid && this._recentUUIDs.has(/** @type {string} */(msg.uuid))) {
      return;
    }
    if (msg.uuid) {
      this._recentUUIDs.add(/** @type {string} */(msg.uuid));
    }

    if (!this.currentTask) return;

    // ── stream_event: progressive text deltas ──────────────────────
    // Claude Code emits stream_event messages with incremental text,
    // followed by a final assistant message (full snapshot) and result.
    if (msg.type === "stream_event") {
      const event = /** @type {any} */ (msg.event);
      if (event?.type === "content_block_delta" && event.delta?.type === "text_delta" && event.delta.text) {
        const delta = /** @type {string} */ (event.delta.text);
        this.currentTask.result += delta;
        this._emitTaskChunk(this.currentTask.id, delta);
      }
      return;
    }

    // ── keep_alive: bidirectional heartbeat ────────────────────────
    if (msg.type === "keep_alive") {
      return; // nothing to do; liveness timer was already reset
    }

    // ── system/init: extract session info ──────────────────────────
    if (msg.type === "system" && msg.subtype === "init") {
      this._sessionId = /** @type {string|undefined} */ (msg.session_id);
      return;
    }

    // ── Progressive streaming ──────────────────────────────────────
    // Claude Code sends the FULL content array in each update (same message.id).
    // Track per-message progress to extract only the delta text.
    const msgId = /** @type {string|undefined} */ (msg.message?.id || msg.id);
    const blocks = msg.content || (msg.message && msg.message.content);

    if (blocks) {
      // Concatenate all text blocks into one string
      let fullText = '';
      for (const block of blocks) {
        if (block.type === "text") {
          fullText += block.text;
        }
      }

      if (fullText) {
        // Compute delta against what we've already seen for this message ID
        const prev = msgId ? this._msgTextProgress.get(msgId) : null;
        const prevText = prev?.lastText || '';
        const delta = fullText.slice(prevText.length);

        if (delta) {
          this.currentTask.result += delta;
          this._emitTaskChunk(this.currentTask.id, delta);
        }

        // Update progress (even if delta is empty — avoid re-processing)
        if (msgId) {
          if (prev) {
            prev.lastText = fullText;
          } else {
            this._msgTextProgress.set(msgId, { lastText: fullText });
          }
        }
      }
    }

    // ── Multi-turn: auto-respond when Claude asks a question ──────
    if (msg.type === "user") {
      if (this._autoRespondCount < this._maxAutoRespond) {
        this._autoRespondCount++;
        process.stderr.write(`[bridge] auto-respond #${this._autoRespondCount}/${this._maxAutoRespond}\n`);
        this.transport?.write({
          type: "user",
          session_id: /** @type {string} */ (msg.session_id ?? ""),
          message: { role: "user", content: "Continue. Do not ask for confirmation." },
          parent_tool_use_id: null,
        }).catch(() => {});
      }
      return; // user-type messages are not completion signals
    }

    // ── Completion signals ─────────────────────────────────────────
    if (msg.stop_reason || msg.type === "result") {
      // Official error subtypes: error_during_execution, error_max_turns,
      // error_max_budget_usd, error_max_structured_output_retries
      const isError = typeof msg.subtype === "string" && msg.subtype.startsWith("error_");
      this._finishTask(isError ? 1 : 0);
    }
  }

  _finishTask(exitCode) {
    if (!this.currentTask) return;
    const taskId = this.currentTask.id;
    this.currentTask.status = "done";
    this.currentTask.exitCode = exitCode;
    this._results.set(taskId, { ...this.currentTask });
    this.busy = false;
    writeState({
      latestTask: {
        id: taskId,
        prompt: this.currentTask.prompt,
        status: "done",
        exitCode,
      },
    });
    // Notify SSE subscribers
    this._emitTaskDone(taskId, exitCode);
    this._cleanupSubscribers(taskId);
    this.currentTask = null;
    if (this._taskResolve) {
      this._taskResolve();
      this._taskResolve = null;
    }
  }

  _failTask(reason) {
    if (!this.currentTask) return;
    const taskId = this.currentTask.id;
    this.currentTask.status = "failed";
    this.currentTask.result = reason;
    this._results.set(taskId, { ...this.currentTask });
    this.busy = false;
    writeState({
      latestTask: {
        id: taskId,
        prompt: this.currentTask.prompt,
        status: "failed",
      },
    });
    // Notify SSE subscribers
    this._emitTaskError(taskId, reason);
    this._cleanupSubscribers(taskId);
    this.currentTask = null;
    if (this._taskResolve) {
      this._taskResolve();
      this._taskResolve = null;
    }
  }

  async createTask(prompt, taskId) {
    const id = taskId || `task_${randomUUID()}`;

    // Guard: if reconnection budget exhausted, reject immediately
    if (this._state === STATE.FAILED) {
      throw new Error('Bridge connection failed — restart the server');
    }

    // If reconnecting, wait for connection (or timeout)
    if (this._state === STATE.RECONNECTING) {
      const deadline = Date.now() + RECONNECT_GIVE_UP_MS;
      while (this._state === STATE.RECONNECTING) {
        await sleep(500);
        if (Date.now() > deadline) {
          this._state = STATE.FAILED;
          throw new Error('Reconnection timed out');
        }
      }
    }

    // Ensure Claude is running (state machine handles concurrency)
    if (this._state !== STATE.CONNECTED) {
      const ok = await this._startClaude();
      if (!ok) {
        throw new Error('Failed to start Claude process');
      }
    }

    // Queue: wait for previous task to finish
    if (this.busy) {
      await new Promise((resolve) => {
        const check = setInterval(() => {
          if (!this.busy) { clearInterval(check); resolve(); }
        }, 100);
      });
    }

    // Set up current task
    this.currentTask = {
      id,
      prompt,
      status: "running",
      result: "",
      exitCode: null,
    };
    this.busy = true;
    // Reset per-task streaming state
    this._msgTextProgress.clear();
    this._autoRespondCount = 0;
    writeState({ latestTask: { id, prompt, status: "running" } });

    const taskDone = new Promise((resolve) => {
      this._taskResolve = resolve;
    });

    // Send prompt via transport (ordered batch — integrates with SerialBatchEventUploader)
    const msg = {
      type: "user",
      session_id: "",
      message: { role: "user", content: prompt },
      parent_tool_use_id: null,
    };
    this.transport?.write(msg).catch((err) => {
      process.stderr.write(`[bridge] transport write error: ${err.message}\n`);
      // A write error suggests the child process is dead — trigger reconnect
      if (this._state === STATE.CONNECTED) {
        this._scheduleReconnect();
      }
    });

    // Wait for result (with timeout to prevent infinite hang)
    const winner = await Promise.race([
      taskDone,
      sleep(TASK_TIMEOUT_MS).then(() => "timeout"),
    ]);

    if (winner === "timeout") {
      process.stderr.write(`[bridge] Task ${id} timed out after ${TASK_TIMEOUT_MS / 1000}s\n`);
      process.stderr.write(`[bridge] Check Claude stderr above for errors\n`);
      this._failTask("timeout");
    }

    return { task_id: id, status: "created" };
  }

  getTask(taskId) {
    const t = this._results.get(taskId) ||
      (this.currentTask?.id === taskId ? this.currentTask : null);
    if (!t) return null;
    return { id: t.id, status: t.status, created: 0 };
  }

  getTaskOutput(taskId) {
    const t = this._results.get(taskId) ||
      (this.currentTask?.id === taskId ? this.currentTask : null);
    if (!t) return null;
    const done = t.status === "done" || t.status === "failed";
    return {
      retrieval_status: done ? "success" : "pending",
      task: {
        id: t.id,
        status: t.status,
        result: t.result || "",
        exitCode: t.exitCode ?? null,
      },
    };
  }

  // ── Task streaming (SSE) ───────────────────────────────────────────

  /**
   * Subscribe to streaming output for a task.
   * @param {string} taskId
   * @param {{ write: (data: string) => void }} subscriber
   */
  subscribeTask(taskId, subscriber) {
    if (!this._taskSubscribers.has(taskId)) {
      this._taskSubscribers.set(taskId, new Set());
    }
    this._taskSubscribers.get(taskId).add(subscriber);
  }

  /**
   * Unsubscribe from streaming output for a task.
   * @param {string} taskId
   * @param {{ write: (data: string) => void }} subscriber
   */
  unsubscribeTask(taskId, subscriber) {
    const subs = this._taskSubscribers.get(taskId);
    if (!subs) return;
    subs.delete(subscriber);
    if (subs.size === 0) {
      this._taskSubscribers.delete(taskId);
    }
  }

  /**
   * Emit a text chunk to all subscribers of a task.
   * @param {string} taskId
   * @param {string} text
   */
  _emitTaskChunk(taskId, text) {
    const subs = this._taskSubscribers.get(taskId);
    if (!subs) return;
    const sse = `data: ${JSON.stringify({ type: "chunk", text })}\n\n`;
    for (const sub of subs) {
      try { sub.write(sse); } catch { /* subscriber disconnected */ }
    }
  }

  /**
   * Emit a done signal to all subscribers of a task.
   * @param {string} taskId
   * @param {number} exitCode
   */
  _emitTaskDone(taskId, exitCode) {
    const subs = this._taskSubscribers.get(taskId);
    if (!subs) return;
    const sse = `data: ${JSON.stringify({ type: "done", exitCode })}\n\n`;
    for (const sub of subs) {
      try { sub.write(sse); } catch { /* subscriber disconnected */ }
    }
  }

  /**
   * Emit an error signal to all subscribers of a task.
   * @param {string} taskId
   * @param {string} reason
   */
  _emitTaskError(taskId, reason) {
    const subs = this._taskSubscribers.get(taskId);
    if (!subs) return;
    const sse = `data: ${JSON.stringify({ type: "error", reason })}\n\n`;
    for (const sub of subs) {
      try { sub.write(sse); } catch { /* subscriber disconnected */ }
    }
  }

  /**
   * Clean up all subscribers for a task.
   * @param {string} taskId
   */
  _cleanupSubscribers(taskId) {
    this._taskSubscribers.delete(taskId);
  }

  // ── Connection state ────────────────────────────────────────────────

  /** @returns {string} Current connection state label. */
  getState() {
    return this._state;
  }

  // ── Auto-reconnect ──────────────────────────────────────────────────

  /**
   * Schedule a reconnection attempt with exponential backoff.
   * @returns {boolean} true if reconnection was scheduled
   */
  _scheduleReconnect() {
    if (this._state === STATE.FAILED || this._state === STATE.IDLE) return false;
    if (this._reconnectTimer) return true; // already scheduled

    this._state = STATE.RECONNECTING;

    const now = Date.now();
    if (!this._reconnectStartTime) {
      this._reconnectStartTime = now;
    }

    const elapsed = now - this._reconnectStartTime;
    if (elapsed >= RECONNECT_GIVE_UP_MS) {
      process.stderr.write(`[bridge] reconnect give up after ${Math.round(elapsed / 1000)}s\n`);
      this._state = STATE.FAILED;
      // Clear pending tasks
      if (this.currentTask) {
        // kill() may have already failed the task — skip if null
        try { this._failTask('connection lost'); } catch {}
      }
      return false;
    }

    this._reconnectAttempts++;
    const baseDelay = Math.min(
      RECONNECT_BASE_MS * Math.pow(2, this._reconnectAttempts - 1),
      RECONNECT_MAX_MS,
    );
    // ±25% jitter
    const delay = Math.max(0, baseDelay + baseDelay * 0.25 * (2 * Math.random() - 1));

    process.stderr.write(
      `[bridge] reconnect in ${Math.round(delay)}ms (attempt ${this._reconnectAttempts}, ${Math.round(elapsed / 1000)}s elapsed)\n`,
    );

    this._reconnectTimer = setTimeout(async () => {
      this._reconnectTimer = null;
      // Clean up old child + transport before retry
      this._cleanupProcess();
      const ok = await this._startClaude();
      if (!ok && this._state !== STATE.FAILED) {
        // startClaude already called _scheduleReconnect on failure
        // Only fall through if it didn't (e.g. already connected)
      }
    }, delay);

    return true;
  }

  /** Reset reconnect state after successful connection. */
  _resetReconnectState() {
    this._reconnectAttempts = 0;
    this._reconnectStartTime = null;
  }

  /** Clean up child process and transport resources. */
  _cleanupProcess() {
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
    if (this.transport) {
      try { this.transport.close(); } catch {}
      this.transport = null;
    }
    if (this.child) {
      try { this.child.kill(); } catch {}
      this.child = null;
    }
    this._clearKeepAlive();
    this._clearLiveness();
  }

  // ── Keep-alive ──────────────────────────────────────────────────────

  /** Start sending periodic keep_alive frames to the child. */
  _ensureKeepAlive() {
    this._clearKeepAlive();
    this._keepAliveTimer = setInterval(() => {
      if (this._state !== STATE.CONNECTED || !this.transport) return;
      this.transport.write({ type: 'keep_alive' }).catch(() => {});
    }, KEEPALIVE_INTERVAL_MS);
  }

  /** Stop keep-alive timer. */
  _clearKeepAlive() {
    if (this._keepAliveTimer) {
      clearInterval(this._keepAliveTimer);
      this._keepAliveTimer = null;
    }
  }

  // ── Liveness detection ──────────────────────────────────────────────

  /** Reset the liveness timeout (call on every inbound message). */
  _resetLiveness() {
    this._clearLiveness();
    this._lastActivityTime = Date.now();
    this._livenessTimer = setTimeout(() => {
      this._livenessTimer = null;
      if (this._state !== STATE.CONNECTED) return;
      const idle = Date.now() - this._lastActivityTime;
      process.stderr.write(
        `[bridge] liveness timeout after ${Math.round(idle / 1000)}s idle — reconnecting\n`,
      );
      this._cleanupProcess();
      this._scheduleReconnect();
    }, LIVENESS_TIMEOUT_MS);
  }

  /** Stop liveness timer. */
  _clearLiveness() {
    if (this._livenessTimer) {
      clearTimeout(this._livenessTimer);
      this._livenessTimer = null;
    }
  }
}
