/**
 * Session — one Claude Code child process, one task.
 *
 * Lightweight lifecycle: spawn → send prompt → handle NDJSON → complete.
 * No state machine, no reconnect, no liveness — just spawn, run, cleanup.
 *
 *   → {"role":"user","content":"fix bug"}
 *   ← {"type":"assistant","message":{"content":[{"type":"text","text":"..."}]}}
 *   ← {"type":"result","subtype":"success"}
 */

import { spawn } from "child_process";
import { StdioTransport } from "./transport/StdioTransport.mjs";
import { BoundedUUIDSet } from "./bridgeMessaging.mjs";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CLAUDE_ARGS = [
  "@anthropic-ai/claude-code",
  "--print",
  "--input-format", "stream-json",
  "--output-format", "stream-json",
  "--verbose",
  // "--dangerously-skip-permissions",   // Hermes controls permissions via Pipeline
];

const DEFAULT_TASK_TIMEOUT_MS = 0; // 0 = no timeout (opt-in via taskTimeoutMs)
const DEFAULT_MAX_AUTO_RESPOND = 5;
const DEFAULT_PERMISSION_MODE = "bypass"; // "bypass" | "approve"

export class Session {
  /**
   * @param {object} opts
   * @param {string} opts.taskId
   * @param {string} opts.prompt
   * @param {string} [opts.cwd]
   * @param {number} [opts.taskTimeoutMs]
   * @param {number} [opts.maxAutoRespond]
   * @param {"bypass"|"approve"} [opts.permissionMode]
   * @param {(session: Session) => void} [opts.onComplete]
   * @param {(session: Session, reason: string) => void} [opts.onError]
   */
  constructor(opts = {}) {
    this.taskId = opts.taskId || "unknown";
    this.prompt = opts.prompt || "";
    this.status = "idle"; // idle | spawning | running | done | failed
    this.result = "";
    this.exitCode = null;
    this.usage = null;
    this.startedAt = 0;

    this._cwd = opts.cwd || undefined;
    this._taskTimeoutMs = opts.taskTimeoutMs ?? DEFAULT_TASK_TIMEOUT_MS;
    this._maxAutoRespond = opts.maxAutoRespond ?? DEFAULT_MAX_AUTO_RESPOND;
    this._permissionMode = opts.permissionMode ?? DEFAULT_PERMISSION_MODE;
    this._onComplete = opts.onComplete || null;
    this._onError = opts.onError || null;

    // Child process + transport
    this.child = null;
    this.transport = null;

    // Echo dedup
    this._recentUUIDs = new BoundedUUIDSet(2000);

    // SSE subscribers (per-session, keyed by taskId)
    /** @type {Set<{ write: (data: string) => void }>} */
    this._subscribers = new Set();

    // Progressive streaming state
    /** @type {Map<string, { lastText: string }>} */
    this._msgTextProgress = new Map();
    this._streamTextAccum = 0;

    // Multi-turn auto-respond
    this._autoRespondCount = 0;

    // Permission pipeline
    /** @type {{ requestId: string, toolName: string, input: object, toolUseId: string, timestamp: number }|null} */
    this._pendingPermission = null;

    // Timeout
    this._timeoutTimer = null;
    this._resolveTask = null;
    this._taskPromise = null;
  }

  // ── Public API ───────────────────────────────────────────────────────

  /**
   * Spawn Claude Code, connect transport, send prompt.
   * Returns immediately — task runs asynchronously.
   * @returns {Promise<{task_id: string, status: string}>}
   */
  async start() {
    if (this.status !== "idle") {
      throw new Error(`Session ${this.taskId} already started (${this.status})`);
    }

    this.status = "spawning";
    this.startedAt = Date.now();
    this.result = "";
    this.exitCode = null;
    this.usage = null;
    this._autoRespondCount = 0;
    this._msgTextProgress.clear();
    this._streamTextAccum = 0;

    const cwd = this._cwd || process.cwd();
    const isWin = process.platform === "win32";
    const cmd = isWin ? "cmd.exe" : "npx";
    const args = isWin
      ? ["/d", "/s", "/c", `npx.cmd ${CLAUDE_ARGS.join(" ")}`]
      : CLAUDE_ARGS;

    try {
      this.child = spawn(cmd, args, {
        stdio: ["pipe", "pipe", "pipe"],
        cwd,
        env: { ...process.env },
      });
    } catch (err) {
      process.stderr.write(`[session] spawn error: ${err.message}\n`);
      this.status = "failed";
      this.result = err.message;
      this.exitCode = 1;
      this._notifyError(err.message);
      return { task_id: this.taskId, status: "failed" };
    }

    // Create transport (transcript disabled — not useful for per-task processes)
    this.transport = new StdioTransport(this.child, { transcriptPath: null });

    // Wire inbound messages
    this.transport.setOnData((line) => {
      try {
        // Escape U+2028 (LINE SEPARATOR) and U+2029 (PARAGRAPH SEPARATOR)
        const LS = String.fromCharCode(0x2028);
        const PS = String.fromCharCode(0x2029);
        const sanitized = line.replaceAll(LS, '\\u2028').replaceAll(PS, '\\u2029');
        const msg = JSON.parse(sanitized);
        this._onMessage(msg);
      } catch (e) {
        process.stderr.write(`[claude:stdout] non-JSON (${line.length}B): ${line.slice(0, 200)}\n`);
      }
    });

    this.transport.setOnClose((code) => {
      process.stderr.write(`[session] ${this.taskId}: transport closed (code=${code})\n`);
      if (this.status === "running" || this.status === "spawning") {
        this._failTask(`Claude process exited (code=${code})`);
      }
    });

    this.transport.connect();
    this.status = "running";

    // Start task timeout (0 = no timeout)
    if (this._taskTimeoutMs > 0) {
      this._timeoutTimer = setTimeout(() => {
        process.stderr.write(`[session] ${this.taskId}: timeout after ${this._taskTimeoutMs / 1000}s\n`);
        this._failTask("timeout");
      }, this._taskTimeoutMs);
    }

    // Create promise that resolves on completion
    this._taskPromise = new Promise((resolve) => {
      this._resolveTask = resolve;
    });

    // Send prompt via transport
    const msg = {
      type: "user",
      session_id: "",
      message: { role: "user", content: this.prompt },
      parent_tool_use_id: null,
    };
    try {
      await this.transport.write(msg);
    } catch (err) {
      process.stderr.write(`[session] ${this.taskId}: transport write error: ${err.message}\n`);
      this._failTask(`write error: ${err.message}`);
    }

    return { task_id: this.taskId, status: "created" };
  }

  /**
   * Cancel the running task.
   * @returns {boolean}
   */
  cancel() {
    if (this.status !== "running") return false;
    process.stderr.write(`[session] cancelling task ${this.taskId}\n`);
    // Send interrupt
    this.transport?.write({
      type: "control_request",
      request_id: `cancel_${this.taskId}`,
      request: { subtype: "interrupt" },
    }).catch(() => {});
    // Grace period then kill
    setTimeout(() => {
      if (this.child && !this.child.killed) {
        try { this.child.kill(); } catch {}
      }
    }, 500);
    this._failTask("cancelled");
    return true;
  }

  /**
   * Respond to a pending permission request (can_use_tool).
   * @param {"allow"|"deny"} behavior
   * @param {object} [updatedInput] - Modified tool input for "allow"
   * @param {string} [message] - Denial reason for "deny"
   * @returns {boolean} true if a pending request was responded to
   */
  respondPermission(behavior, updatedInput, message) {
    if (!this._pendingPermission) return false;
    const req = this._pendingPermission;
    this._pendingPermission = null;

    const payload = behavior === "allow"
      ? { behavior: "allow", updatedInput: updatedInput || req.input }
      : { behavior: "deny", message: message || "Permission denied by Hermes" };

    process.stderr.write(`[session] ${this.taskId} permission: ${behavior} for ${req.toolName}\n`);
    this.transport?.write({
      type: "control_response",
      response_id: req.requestId,
      response: { subtype: "success", response: payload },
    }).catch(() => {});
    return true;
  }

  /** @returns {object|null} The pending permission request, if any */
  getPendingPermission() {
    return this._pendingPermission;
  }

  // ── SSE subscribers ─────────────────────────────────────────────────

  /** @param {{ write: (data: string) => void }} subscriber */
  subscribe(subscriber) {
    this._subscribers.add(subscriber);
  }

  /** @param {{ write: (data: string) => void }} subscriber */
  unsubscribe(subscriber) {
    this._subscribers.delete(subscriber);
  }

  // ── Internal: message handling ──────────────────────────────────────

  /**
   * Handle a parsed NDJSON message from Claude's stdout.
   * @param {Record<string,unknown>} msg
   */
  _onMessage(msg) {
    process.stderr.write(`[session:msg] ${this.taskId} role=${msg.role || msg.type || "?"}\n`);

    // UUID-based echo dedup
    if (msg.uuid && this._recentUUIDs.has(/** @type {string} */(msg.uuid))) return;
    if (msg.uuid) this._recentUUIDs.add(/** @type {string} */(msg.uuid));

    // ── keep_alive ─────────────────────────────────────────────────
    if (msg.type === "keep_alive") return;

    // ── system/init ────────────────────────────────────────────────
    if (msg.type === "system" && msg.subtype === "init") return;

    // ── control_request: lifecycle handshake or tool permission ─────
    if (msg.type === "control_request") {
      const reqId = /** @type {string} */ (msg.request_id ?? '');
      const subtype = /** @type {string|undefined} */ (msg.request?.subtype);
      process.stderr.write(`[session] ${this.taskId} control_request: ${subtype || '?'} (id=${reqId})\n`);

      // can_use_tool: permission pipeline
      if (subtype === "can_use_tool") {
        if (this._permissionMode === "bypass") {
          // Auto-allow — transparent, no SSE event emitted
          process.stderr.write(`[session] ${this.taskId} bypass permission: ${msg.request?.tool_name ?? ""}\n`);
          this.transport?.write({
            type: "control_response",
            response_id: reqId,
            response: {
              subtype: "success",
              response: { behavior: "allow", updatedInput: msg.request?.input ?? {} },
            },
          }).catch(() => {});
          return;
        }

        // "approve" mode — block, emit permission_request, await external response
        this._pendingPermission = {
          requestId: reqId,
          toolName: /** @type {string} */ (msg.request?.tool_name ?? ""),
          input: msg.request?.input ?? {},
          toolUseId: /** @type {string} */ (msg.request?.tool_use_id ?? ""),
          timestamp: Date.now(),
        };
        process.stderr.write(`[session] ${this.taskId} awaiting permission: ${this._pendingPermission.toolName}\n`);
        this._emitTaskEvent("permission_request", {
          request_id: reqId,
          task_id: this.taskId,
          tool_name: this._pendingPermission.toolName,
          input: this._pendingPermission.input,
          tool_use_id: this._pendingPermission.toolUseId,
        });
        // Block until respondPermission() is called (or timeout handled externally)
        return;
      }

      // Other control requests (initialize, interrupt, etc.): auto-respond
      this.transport?.write({
        type: "control_response",
        response_id: reqId,
        response: { subtype: "success" },
      }).catch(() => {});
      return;
    }

    // ── tool_progress: forward to subscribers ──────────────────────
    if (msg.type === "tool_progress") {
      const toolName = /** @type {string} */ (msg.tool_name ?? "");
      const elapsed = /** @type {number} */ (msg.elapsed_time_seconds ?? 0);
      process.stderr.write(`[session] ${this.taskId} tool_progress: ${toolName} ${elapsed}s\n`);
      this._emitTaskEvent("tool_progress", { tool_name: toolName, elapsed });
      return;
    }

    // ── auth_status ────────────────────────────────────────────────
    if (msg.type === "auth_status") {
      if (msg.isAuthenticating) process.stderr.write(`[session] ${this.taskId} auth: authenticating...\n`);
      if (msg.error) process.stderr.write(`[session] ${this.taskId} auth error: ${msg.error}\n`);
      return;
    }

    // ── rate_limit_event ───────────────────────────────────────────
    if (msg.type === "rate_limit_event") {
      const status = /** @type {string|undefined} */ (msg.rate_limit_info?.status);
      process.stderr.write(`[session] ${this.taskId} rate_limit: ${status || "?"}\n`);
      return;
    }

    // ── session_state_changed ─────────────────────────────────────
    if (msg.type === "session_state_changed") {
      const state = /** @type {string|undefined} */ (msg.state);
      process.stderr.write(`[session] ${this.taskId} session_state: ${state}\n`);
      if (state === "idle") {
        process.stderr.write(`[session] ${this.taskId} session idle → finishing\n`);
        this._finishTask(0);
      }
      return;
    }

    // ── stream_event: progressive text deltas ──────────────────────
    if (msg.type === "stream_event") {
      const event = /** @type {any} */ (msg.event);
      if (event?.type === "content_block_delta" && event.delta?.type === "text_delta" && event.delta.text) {
        const delta = /** @type {string} */ (event.delta.text);
        this.result += delta;
        this._streamTextAccum += delta.length;
        this._emitChunk(delta);
      }
      return;
    }

    // ── Progressive streaming (content blocks) ─────────────────────
    const msgId = /** @type {string|undefined} */ (msg.message?.id || msg.id);
    const blocks = msg.content || (msg.message && msg.message.content);

    if (blocks) {
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
        let delta;
        if (msgId) {
          const prev = this._msgTextProgress.get(msgId);
          const prevText = prev?.lastText || '';
          delta = fullText.slice(prevText.length);
          if (prev) {
            prev.lastText = fullText;
          } else {
            this._msgTextProgress.set(msgId, { lastText: fullText });
          }
        } else {
          delta = fullText.slice(this._streamTextAccum);
        }
        if (delta) {
          this.result += delta;
          this._emitChunk(delta);
        }
      }
    }

    // ── Multi-turn auto-respond ────────────────────────────────────
    if (msg.type === "user") {
      if (this._autoRespondCount < this._maxAutoRespond) {
        this._autoRespondCount++;
        process.stderr.write(`[session] ${this.taskId} auto-respond #${this._autoRespondCount}/${this._maxAutoRespond}\n`);
        this.transport?.write({
          type: "user",
          session_id: /** @type {string} */ (msg.session_id ?? ""),
          message: { role: "user", content: "Continue. Do not ask for confirmation." },
          parent_tool_use_id: null,
        }).catch(() => {});
      }
      return;
    }

    // ── Completion signals ─────────────────────────────────────────
    if (msg.stop_reason || msg.type === "result") {
      // Extract usage/cost
      const totalCostUsd = /** @type {number|undefined} */ (msg.total_cost_usd);
      const usage = /** @type {Record<string,number>|undefined} */ (msg.usage);
      if (totalCostUsd !== undefined || usage !== undefined) {
        this.usage = {
          total_cost_usd: totalCostUsd ?? 0,
          input_tokens: usage?.input_tokens ?? 0,
          output_tokens: usage?.output_tokens ?? 0,
          cache_creation_input_tokens: usage?.cache_creation_input_tokens ?? 0,
          cache_read_input_tokens: usage?.cache_read_input_tokens ?? 0,
        };
        process.stderr.write(
          `[session] ${this.taskId} usage: $${this.usage.total_cost_usd} ` +
          `(in=${this.usage.input_tokens} out=${this.usage.output_tokens} ` +
          `cache_creation=${this.usage.cache_creation_input_tokens} ` +
          `cache_read=${this.usage.cache_read_input_tokens})\n`,
        );
      }

      const isError = typeof msg.subtype === "string" && msg.subtype.startsWith("error_");
      this._finishTask(isError ? 1 : 0);
    }
  }

  // ── Internal: lifecycle helpers ─────────────────────────────────────

  _finishTask(exitCode) {
    if (this.status === "done" || this.status === "failed") return;
    this.status = "done";
    this.exitCode = exitCode;
    this._clearTimeout();
    this._emitDone(exitCode);
    this._cleanupSubscribers();
    this._cleanup();
    if (this._resolveTask) {
      this._resolveTask();
      this._resolveTask = null;
    }
    this._onComplete?.(this);
  }

  _failTask(reason) {
    if (this.status === "done" || this.status === "failed") return;
    this.status = "failed";
    this.result = reason;
    this.exitCode = 1;
    this._clearTimeout();
    this._emitError(reason);
    this._cleanupSubscribers();
    this._cleanup();
    if (this._resolveTask) {
      this._resolveTask();
      this._resolveTask = null;
    }
    this._onError?.(this, reason);
  }

  _cleanup() {
    if (this.transport) {
      try { this.transport.close(); } catch {}
      this.transport = null;
    }
    if (this.child && !this.child.killed) {
      try { this.child.kill(); } catch {}
    }
    this.child = null;
  }

  _clearTimeout() {
    if (this._timeoutTimer) {
      clearTimeout(this._timeoutTimer);
      this._timeoutTimer = null;
    }
  }

  // ── Internal: SSE emit helpers ─────────────────────────────────────

  _emitChunk(text) {
    const sse = `data: ${JSON.stringify({ type: "chunk", text })}\n\n`;
    for (const sub of this._subscribers) {
      try { sub.write(sse); } catch { /* disconnected */ }
    }
  }

  _emitTaskEvent(eventType, data) {
    const sse = `data: ${JSON.stringify({ type: eventType, ...data })}\n\n`;
    for (const sub of this._subscribers) {
      try { sub.write(sse); } catch { /* disconnected */ }
    }
  }

  _emitDone(exitCode) {
    const sse = `data: ${JSON.stringify({ type: "done", exitCode })}\n\n`;
    for (const sub of this._subscribers) {
      try { sub.write(sse); } catch { /* disconnected */ }
    }
  }

  _emitError(reason) {
    const sse = `data: ${JSON.stringify({ type: "error", reason })}\n\n`;
    for (const sub of this._subscribers) {
      try { sub.write(sse); } catch { /* disconnected */ }
    }
  }

  _cleanupSubscribers() {
    this._subscribers.clear();
  }

  /** @param {string} reason */
  _notifyError(reason) {
    this._onError?.(this, reason);
  }
}
