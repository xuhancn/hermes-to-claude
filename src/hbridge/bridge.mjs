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
import { appendCompletedTask, loadCompletedTasks } from "./persistence.mjs";

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
  /**
   * @param {object} [opts]
   * @param {string} [opts.cwd] - Working directory for spawned Claude Code process
   */
  constructor(opts = {}) {
    /** Working directory for the child process. */
    this._cwd = opts.cwd || undefined;

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
    /** Total text accumulated from stream_event deltas in current task. */
    this._streamTextAccum = 0;

    // ── Session tracking ──
    /** @type {string|undefined} */
    this._sessionId = undefined;
    /** @type {string|undefined} */
    this._cwd = undefined;

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
  /**
   * @param {{ cwd?: string }} [opts]
   */
  async _startClaude(opts = {}) {
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

    // Use provided cwd, or stored cwd, or default to process.cwd()
    const cwd = opts.cwd || this._cwd || process.cwd();
    this._cwd = cwd;

    const isWin = process.platform === "win32";
    const cmd = isWin ? "cmd.exe" : "npx";
    const args = isWin ? ["/d", "/s", "/c", `npx.cmd ${CLAUDE_ARGS.join(" ")}`] : CLAUDE_ARGS;

    try {
      this.child = spawn(cmd, args, {
        stdio: ["pipe", "pipe", "pipe"],
        cwd,
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
        // Escape U+2028 (LINE SEPARATOR) and U+2029 (PARAGRAPH SEPARATOR)
        // which are valid in JSON5 but cause JSON.parse to throw in strict mode JSON.
        const LS = String.fromCharCode(0x2028);
        const PS = String.fromCharCode(0x2029);
        const sanitized = line.replaceAll(LS, '\\u2028').replaceAll(PS, '\\u2029');
        const msg = JSON.parse(sanitized);
        if (!this._ready) this._ready = true;
        this._onMessage(msg);
      } catch (e) {
        // NDJSON guard — non-JSON lines are redirected to stderr for visibility
        process.stderr.write(`[claude:stdout] non-JSON (${line.length}B): ${line.slice(0, 200)}\n`);
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

    // ── keep_alive: bidirectional heartbeat ────────────────────────
    if (msg.type === "keep_alive") {
      return; // nothing to do; liveness timer was already reset
    }

    // ── system/init: extract session info ──────────────────────────
    if (msg.type === "system" && msg.subtype === "init") {
      this._sessionId = /** @type {string|undefined} */ (msg.session_id);
      return;
    }

    // ── control_request: lifecycle handshake ────────────────────────
    // Claude Code emits control_request for lifecycle events (initialize, etc.)
    // The bridge must respond with a control_response.
    if (msg.type === "control_request") {
      const reqId = /** @type {string} */ (msg.request_id ?? '');
      const subtype = /** @type {string|undefined} */ (msg.request?.subtype);
      process.stderr.write(`[bridge] control_request: ${subtype || '?'} (id=${reqId})\n`);
      this.transport?.write({
        type: "control_response",
        response_id: reqId,
        response: { subtype: "success" },
      }).catch(() => {});
      return;
    }

    // ── tool_progress: forward to SSE subscribers ─────────────────
    if (msg.type === "tool_progress") {
      const toolName = /** @type {string} */ (msg.tool_name ?? "");
      const elapsed = /** @type {number} */ (msg.elapsed_time_seconds ?? 0);
      process.stderr.write(`[bridge] tool_progress: ${toolName} ${elapsed}s\n`);
      this._emitTaskEvent(this.currentTask?.id ?? "", "tool_progress", {
        tool_name: toolName, elapsed,
      });
      return;
    }

    // ── auth_status: log changes ──────────────────────────────────
    if (msg.type === "auth_status") {
      if (msg.isAuthenticating) process.stderr.write("[bridge] auth: authenticating...\n");
      if (msg.error) process.stderr.write("[bridge] auth error: " + msg.error + "\n");
      return;
    }

    // ── rate_limit_event: log for visibility ──────────────────────
    if (msg.type === "rate_limit_event") {
      const status = /** @type {string|undefined} */ (msg.rate_limit_info?.status);
      process.stderr.write("[bridge] rate_limit: " + (status || "?") + "\n");
      return;
    }

    // ── session_state_changed: map to task status ──────────────────
    if (msg.type === "session_state_changed") {
      const state = /** @type {string|undefined} */ (msg.state);
      process.stderr.write(`[bridge] session_state: ${state}\n`);
      if (state === "idle" && this.currentTask) {
        process.stderr.write(`[bridge] session idle → finishing task\n`);
        this._finishTask(0);
      }
      return;
    }

    // Everything below requires a current task
    if (!this.currentTask) return;

    // ── stream_event: progressive text deltas ──────────────────────
    // Claude Code emits stream_event messages with incremental text,
    // followed by a final assistant message (full snapshot) and result.
    if (msg.type === "stream_event") {
      const event = /** @type {any} */ (msg.event);
      if (event?.type === "content_block_delta" && event.delta?.type === "text_delta" && event.delta.text) {
        const delta = /** @type {string} */ (event.delta.text);
        this.currentTask.result += delta;
        this._streamTextAccum += delta.length; // track total from stream_event
        this._emitTaskChunk(this.currentTask.id, delta);
      }
      return;
    }

    // ── Progressive streaming ──────────────────────────────────────
    // Claude Code sends the FULL content array in each update (same message.id).
    // Track per-message progress to extract only the delta text.
    const msgId = /** @type {string|undefined} */ (msg.message?.id || msg.id);
    const blocks = msg.content || (msg.message && msg.message.content);

    if (blocks) {
      // Concatenate all content blocks into one string for delta tracking
      // Supports: text, tool_use, tool_result
      let fullText = '';
      for (const block of blocks) {
        if (block.type === "text") {
          fullText += block.text;
        } else if (block.type === "tool_use") {
          fullText += `\n<tool_use name="${block.name}">\n${JSON.stringify(block.input)}\n</tool_use>\n`;
        } else if (block.type === "tool_result") {
          let resultText = '';
          if (typeof block.content === 'string') {
            resultText = block.content;
          } else if (Array.isArray(block.content)) {
            for (const item of block.content) {
              if (item.type === "text") resultText += item.text;
            }
          }
          fullText += `\n<tool_result>\n${resultText}\n</tool_result>\n`;
        }
      }

      if (fullText) {
        // Compute delta: if message has an ID, use per-message tracking;
        // otherwise check if text was already delivered via stream_event deltas.
        let delta;
        if (msgId) {
          const prev = this._msgTextProgress.get(msgId);
          const prevText = prev?.lastText || '';
          delta = fullText.slice(prevText.length);
          // Update progress (even if delta is empty — avoid re-processing)
          if (prev) {
            prev.lastText = fullText;
          } else {
            this._msgTextProgress.set(msgId, { lastText: fullText });
          }
        } else {
          // No message ID — use stream_event accumulated text as baseline
          // to avoid duplicating text delivered via stream_event deltas.
          delta = fullText.slice(this._streamTextAccum);
        }

        if (delta) {
          this.currentTask.result += delta;
          this._emitTaskChunk(this.currentTask.id, delta);
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
      // Extract usage/cost from result messages:
      //   { type: "result", total_cost_usd: 0.01,
      //     usage: { input_tokens: 150, output_tokens: 300,
      //              cache_creation_input_tokens: 0, cache_read_input_tokens: 0 } }
      // The same fields may also appear on assistant messages with stop_reason.
      if (this.currentTask) {
        const totalCostUsd = /** @type {number|undefined} */ (msg.total_cost_usd);
        const usage = /** @type {Record<string,number>|undefined} */ (msg.usage);
        if (totalCostUsd !== undefined || usage !== undefined) {
          this.currentTask.usage = {
            total_cost_usd: totalCostUsd ?? 0,
            input_tokens: usage?.input_tokens ?? 0,
            output_tokens: usage?.output_tokens ?? 0,
            cache_creation_input_tokens: usage?.cache_creation_input_tokens ?? 0,
            cache_read_input_tokens: usage?.cache_read_input_tokens ?? 0,
          };
          process.stderr.write(
            `[bridge] usage: $${this.currentTask.usage.total_cost_usd} ` +
            `(in=${this.currentTask.usage.input_tokens} ` +
            `out=${this.currentTask.usage.output_tokens} ` +
            `cache_creation=${this.currentTask.usage.cache_creation_input_tokens} ` +
            `cache_read=${this.currentTask.usage.cache_read_input_tokens})\n`,
          );
        }
      }

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
    appendCompletedTask(this.currentTask);
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
    appendCompletedTask(this.currentTask);
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

  /**
   * Create a new task.
   * @param {string} prompt
   * @param {string} [taskId]
   * @param {{ cwd?: string }} [opts]
   */
  async createTask(prompt, taskId, opts = {}) {
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
    // Pass cwd so the child process spawns in the right directory
    if (this._state !== STATE.CONNECTED) {
      const ok = await this._startClaude({ cwd: opts.cwd });
      if (!ok) {
        throw new Error('Failed to start Claude process');
      }
    } else if (opts.cwd && opts.cwd !== this._cwd) {
      // cwd changed — restart Claude with new cwd
      process.stderr.write(`[bridge] cwd changed (${this._cwd} → ${opts.cwd}), restarting\n`);
      this._cleanupProcess();
      const ok = await this._startClaude({ cwd: opts.cwd });
      if (!ok) throw new Error('Failed to restart Claude with new cwd');
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
      usage: null,
    };
    this.busy = true;
    // Reset per-task streaming state
    this._msgTextProgress.clear();
    this._streamTextAccum = 0;
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

  /**
   * Cancel a running task by ID.
   * @param {string} taskId
   * @returns {boolean} true if the task was found and cancelled
   */
  cancelTask(taskId) {
    // Check current task
    if (this.currentTask && this.currentTask.id === taskId) {
      process.stderr.write(`[bridge] cancelling task ${taskId}\n`);
      // Send interrupt control request to Claude Code
      this.transport?.write({
        type: "control_request",
        request_id: `cancel_${taskId}`,
        request: { subtype: "interrupt" },
      }).catch(() => {});
      this._failTask("cancelled");
      return true;
    }

    // Check completed tasks (remove from results)
    if (this._results.has(taskId)) {
      this._results.delete(taskId);
      return true;
    }

    return false;
  }

  getTask(taskId) {
    const t = this._results.get(taskId) ||
      (this.currentTask?.id === taskId ? this.currentTask : null);
    if (!t) return null;
    return { id: t.id, status: t.status, created: 0, usage: t.usage ?? null };
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
        usage: t.usage ?? null,
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
   * Emit an arbitrary event to all subscribers of a task.
   * @param {string} taskId
   * @param {string} eventType
   * @param {Record<string,unknown>} data
   */
  _emitTaskEvent(taskId, eventType, data) {
    const subs = this._taskSubscribers.get(taskId);
    if (!subs) return;
    const sse = `data: ${JSON.stringify({ type: eventType, ...data })}\n\n`;
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
    this._state = STATE.IDLE; // prevent reconnect on transport close events
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

/**
 * BridgeManager — manages multiple Bridge instances keyed by sessionId
 * for parallel Claude processes.
 *
 * - Each sessionId maps to an independent Bridge (own child process).
 * - createTask accepts optional `sessionId` for routing.
 * - getTask / getTaskOutput search all sessions + persisted tasks from disk.
 * - subscribeTask wires to all current and future sessions.
 */
export class BridgeManager {
  /**
   * @param {Bridge} [defaultBridge] - Optional bridge for default session
   */
  constructor(defaultBridge) {
    /** @type {Map<string, Bridge>} */
    this._sessions = new Map();
    this._defaultSessionId = 'default';

    // Create default session bridge
    this._sessions.set(this._defaultSessionId, defaultBridge || new Bridge());

    // Pending SSE subscribers for tasks that may start on future sessions
    /** @type {Map<string, Set<{write: (data:string) => void}>>|null} */
    this._pendingTaskSubs = null;
  }

  /**
   * Load persisted tasks from disk. Always reads fresh to pick up
   * tasks written by any Bridge instance since the last check.
   * @returns {Map<string, object>}
   */
  _getPersistedTasks() {
    const map = new Map();
    try {
      const tasks = loadCompletedTasks();
      for (const t of tasks) {
        map.set(t.id, t);
      }
    } catch { /* ignore */ }
    return map;
  }

  /**
   * Get or create a Bridge instance for the given session.
   * @param {string} sessionId
   * @returns {Bridge}
   */
  _getOrCreateSession(sessionId) {
    if (!this._sessions.has(sessionId)) {
      const bridge = new Bridge();
      bridge._sessionId = sessionId;
      this._sessions.set(sessionId, bridge);
      // Wire any pending subscribers to the new session
      this._wirePendingSubscribers(bridge);
    }
    return this._sessions.get(sessionId);
  }

  /**
   * Wire any pending task subscribers to a newly created bridge session.
   * @param {Bridge} bridge
   */
  _wirePendingSubscribers(bridge) {
    if (!this._pendingTaskSubs) return;
    for (const [taskId, subs] of this._pendingTaskSubs) {
      for (const sub of subs) {
        bridge.subscribeTask(taskId, sub);
      }
    }
  }

  /**
   * Create a new task, optionally in a specific session.
   * @param {string} prompt
   * @param {string} [taskId]
   * @param {{ sessionId?: string, cwd?: string }} [opts]
   * @returns {Promise<{task_id: string, status: string}>}
   */
  async createTask(prompt, taskId, opts = {}) {
    const sessionId = (opts && opts.sessionId) || this._defaultSessionId;
    const bridge = this._getOrCreateSession(sessionId);
    return bridge.createTask(prompt, taskId, opts);
  }

  /**
   * Cancel a task in a specific session or across all sessions.
   * @param {string} taskId
   * @param {{ sessionId?: string }} [opts]
   * @returns {boolean}
   */
  cancelTask(taskId, opts = {}) {
    const sessionId = opts && opts.sessionId;
    if (sessionId) {
      const bridge = this._sessions.get(sessionId);
      return bridge ? bridge.cancelTask(taskId) : false;
    }
    // Search all sessions
    for (const bridge of this._sessions.values()) {
      if (bridge.cancelTask(taskId)) return true;
    }
    return false;
  }

  /**
   * Get task info from active sessions or persisted tasks.
   * @param {string} taskId
   * @param {{ sessionId?: string }} [opts]
   * @returns {object|null}
   */
  getTask(taskId, opts = {}) {
    const sessionId = opts && opts.sessionId;
    if (sessionId) {
      const bridge = this._sessions.get(sessionId);
      if (bridge) {
        const t = bridge.getTask(taskId);
        if (t) return t;
      }
    } else {
      // Search all sessions
      for (const bridge of this._sessions.values()) {
        const t = bridge.getTask(taskId);
        if (t) return t;
      }
    }
    // Check persisted tasks
    const persisted = this._getPersistedTasks().get(taskId);
    if (persisted) {
      return {
        id: persisted.id,
        status: persisted.status,
        created: persisted.completedAt || 0,
        usage: persisted.usage ?? null,
      };
    }
    return null;
  }

  /**
   * Get task output from active sessions or persisted tasks.
   * @param {string} taskId
   * @param {{ sessionId?: string }} [opts]
   * @returns {object|null}
   */
  getTaskOutput(taskId, opts = {}) {
    const sessionId = opts && opts.sessionId;
    if (sessionId) {
      const bridge = this._sessions.get(sessionId);
      if (bridge) {
        const o = bridge.getTaskOutput(taskId);
        if (o) return o;
      }
    } else {
      // Search all sessions
      for (const bridge of this._sessions.values()) {
        const o = bridge.getTaskOutput(taskId);
        if (o) return o;
      }
    }
    // Check persisted tasks
    const persisted = this._getPersistedTasks().get(taskId);
    if (persisted) {
      return {
        retrieval_status: "success",
        task: {
          id: persisted.id,
          status: persisted.status,
          result: persisted.result || "",
          exitCode: persisted.exitCode ?? null,
          usage: persisted.usage ?? null,
        },
      };
    }
    return null;
  }

  /**
   * Subscribe to streaming output for a task.
   * Subscribes on all active bridges; tracks for future sessions.
   * @param {string} taskId
   * @param {{ write: (data: string) => void }} subscriber
   */
  subscribeTask(taskId, subscriber) {
    // Subscribe on all existing sessions
    for (const bridge of this._sessions.values()) {
      bridge.subscribeTask(taskId, subscriber);
    }
    // Track for future sessions
    if (!this._pendingTaskSubs) this._pendingTaskSubs = new Map();
    if (!this._pendingTaskSubs.has(taskId)) {
      this._pendingTaskSubs.set(taskId, new Set());
    }
    this._pendingTaskSubs.get(taskId).add(subscriber);
  }

  /**
   * Unsubscribe from streaming output for a task.
   * @param {string} taskId
   * @param {{ write: (data: string) => void }} subscriber
   */
  unsubscribeTask(taskId, subscriber) {
    for (const bridge of this._sessions.values()) {
      bridge.unsubscribeTask(taskId, subscriber);
    }
    // Also remove from pending
    if (this._pendingTaskSubs && this._pendingTaskSubs.has(taskId)) {
      this._pendingTaskSubs.get(taskId).delete(subscriber);
    }
  }

  /**
   * Get list of active session IDs.
   * @returns {string[]}
   */
  getSessions() {
    return Array.from(this._sessions.keys());
  }

  /**
   * Clean up all bridges (kill child processes, clear sessions).
   */
  cleanup() {
    for (const bridge of this._sessions.values()) {
      bridge._cleanupProcess();
    }
    this._sessions.clear();
    this._pendingTaskSubs = null;
  }
}
