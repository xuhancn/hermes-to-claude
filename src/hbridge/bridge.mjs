/**
 * Bridge — session pool manager for parallel Claude Code tasks.
 *
 * Manages a pool of Session instances (each = one Claude Code child process).
 * Completed tasks are persisted to ~/.hbridge_tasks.jsonl via persistence.mjs.
 *
 * Public API is backward-compatible with the old Bridge + BridgeManager.
 */

import { randomUUID } from "crypto";
import { Session } from "./session.mjs";
import { appendCompletedTask, loadCompletedTasks, findCompletedTask, trimCompletedTasks } from "./persistence.mjs";
import { writeState } from "./state.mjs";

const DEFAULT_MAX_CONCURRENT = 3;
const TRIM_INTERVAL = 100; // trim file every N completions

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export class Bridge {
  /**
   * @param {object} [opts]
   * @param {number} [opts.maxConcurrent] - Max parallel sessions (default 3)
   * @param {number} [opts.taskTimeoutMs] - Per-task timeout (0 = no timeout)
   * @param {"bypass"|"approve"} [opts.permissionMode] - Default permission mode (default "approve")
   * @param {string} [opts.cwd] - Default working directory
   */
  constructor(opts = {}) {
    this._maxConcurrent = opts.maxConcurrent ?? DEFAULT_MAX_CONCURRENT;
    this._taskTimeoutMs = opts.taskTimeoutMs ?? 0; // 0 = no timeout
    this._permissionMode = opts.permissionMode ?? "approve";
    this._cwd = opts.cwd || undefined;

    /** @type {Map<string, import("./session.mjs").Session>} */
    this._sessions = new Map();

    /** @type {Array<{prompt: string, taskId: string, opts: object, resolve: (v: any) => void, reject: (e: Error) => void}>} */
    this._pendingQueue = [];

    /** @type {Map<string, object>} */
    this._completedTasks = new Map();

    /** @type {Map<string, Set<{write: (data: string) => void}>>} */
    this._taskSubscribers = new Map();

    /** Persist counter for periodic trim */
    this._persistCount = 0;

    // Load persisted tasks from disk on start
    this._loadPersistedTasks();
  }

  // ── Public API ───────────────────────────────────────────────────────

  /**
   * Create a new task. Spawns a Claude process or queues if at capacity.
   * @param {string} prompt
   * @param {string} [taskId]
   * @param {{ cwd?: string, sessionId?: string, permissionMode?: "bypass"|"approve" }} [opts]
   * @returns {Promise<{task_id: string, status: string}>}
   */
  async createTask(prompt, taskId, opts = {}) {
    const id = taskId || `task_${randomUUID()}`;

    // If under max concurrent, start immediately
    if (this._sessions.size < this._maxConcurrent) {
      return this._startSession(prompt, id, opts);
    }

    // At capacity — queue
    return new Promise((resolve, reject) => {
      this._pendingQueue.push({ prompt, taskId: id, opts, resolve, reject });
    });
  }

  /**
   * Cancel a running or queued task.
   * @param {string} taskId
   * @param {{ sessionId?: string }} [_opts] - Ignored (kept for compat)
   * @returns {boolean}
   */
  cancelTask(taskId, _opts) {
    // Check active sessions
    const session = this._sessions.get(taskId);
    if (session) {
      session.cancel();
      this._removeSession(taskId);
      return true;
    }

    // Check pending queue
    const qIdx = this._pendingQueue.findIndex((item) => item.taskId === taskId);
    if (qIdx !== -1) {
      const item = this._pendingQueue[qIdx];
      this._pendingQueue.splice(qIdx, 1);
      item.reject(new Error("cancelled"));
      return true;
    }

    // Check completed tasks
    if (this._completedTasks.has(taskId)) {
      this._completedTasks.delete(taskId);
      return true;
    }

    return false;
  }

  /**
   * Get task info (no result text).
   * @param {string} taskId
   * @param {{ sessionId?: string }} [_opts] - Ignored (kept for compat)
   * @returns {object|null}
   */
  getTask(taskId, _opts) {
    // Active session
    const session = this._sessions.get(taskId);
    if (session) {
      return {
        id: session.taskId,
        status: session.status,
        created: session.startedAt,
        usage: session.usage ?? null,
      };
    }

    // Memory cache
    const cached = this._completedTasks.get(taskId);
    if (cached) {
      return {
        id: cached.id,
        status: cached.status,
        created: cached.completedAt || 0,
        usage: cached.usage ?? null,
      };
    }

    // Disk
    const persisted = findCompletedTask(taskId);
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
   * Get task output (includes result text).
   * @param {string} taskId
   * @param {{ sessionId?: string }} [_opts] - Ignored (kept for compat)
   * @returns {object|null}
   */
  getTaskOutput(taskId, _opts) {
    // Active session
    const session = this._sessions.get(taskId);
    if (session) {
      const done = session.status === "done" || session.status === "failed";
      return {
        retrieval_status: done ? "success" : "pending",
        task: {
          id: session.taskId,
          status: session.status,
          result: session.result || "",
          exitCode: session.exitCode ?? null,
          usage: session.usage ?? null,
        },
      };
    }

    // Memory cache
    const cached = this._completedTasks.get(taskId);
    if (cached) {
      return {
        retrieval_status: "success",
        task: {
          id: cached.id,
          status: cached.status,
          result: cached.result || "",
          exitCode: cached.exitCode ?? null,
          usage: cached.usage ?? null,
        },
      };
    }

    // Disk
    const persisted = findCompletedTask(taskId);
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
   * Subscribe to SSE streaming for a task.
   * @param {string} taskId
   * @param {{ write: (data: string) => void }} subscriber
   */
  subscribeTask(taskId, subscriber) {
    // If session is running, subscribe directly
    const session = this._sessions.get(taskId);
    if (session) {
      session.subscribe(subscriber);
      return;
    }

    // Otherwise store for when session starts
    if (!this._taskSubscribers.has(taskId)) {
      this._taskSubscribers.set(taskId, new Set());
    }
    this._taskSubscribers.get(taskId).add(subscriber);
  }

  /**
   * Unsubscribe from SSE streaming for a task.
   * @param {string} taskId
   * @param {{ write: (data: string) => void }} subscriber
   */
  unsubscribeTask(taskId, subscriber) {
    const session = this._sessions.get(taskId);
    if (session) {
      session.unsubscribe(subscriber);
      return;
    }
    const subs = this._taskSubscribers.get(taskId);
    if (subs) {
      subs.delete(subscriber);
      if (subs.size === 0) this._taskSubscribers.delete(taskId);
    }
  }

  /**
   * Get active session count.
   * @returns {number}
   */
  getActiveCount() {
    return this._sessions.size;
  }

  /**
   * Get pending queue depth.
   * @returns {number}
   */
  getQueueDepth() {
    return this._pendingQueue.length;
  }

  /**
   * Respond to a pending permission request for a task.
   * @param {string} taskId
   * @param {"allow"|"deny"} behavior
   * @param {object} [updatedInput]
   * @param {string} [message]
   * @returns {boolean}
   */
  respondPermission(taskId, behavior, updatedInput, message) {
    const session = this._sessions.get(taskId);
    if (!session) return false;
    return session.respondPermission(behavior, updatedInput, message);
  }

  /**
   * Get pending permission request for a task.
   * @param {string} taskId
   * @returns {object|null}
   */
  getPendingPermission(taskId) {
    const session = this._sessions.get(taskId);
    if (!session) return null;
    return session.getPendingPermission();
  }

  // ── Internal ─────────────────────────────────────────────────────────

  /**
   * Start a new session for a task.
   * @param {string} prompt
   * @param {string} taskId
   * @param {object} opts
   * @returns {Promise<{task_id: string, status: string}>}
   */
  async _startSession(prompt, taskId, opts) {
    const session = new Session({
      taskId,
      prompt,
      cwd: opts?.cwd || this._cwd,
      taskTimeoutMs: this._taskTimeoutMs,
      permissionMode: opts?.permissionMode || this._permissionMode,
      onComplete: (s) => this._onSessionComplete(s),
      onError: (s, reason) => this._onSessionError(s, reason),
    });

    this._sessions.set(taskId, session);

    // Forward any pre-subscribed SSE subscribers
    const pendingSubs = this._taskSubscribers.get(taskId);
    if (pendingSubs) {
      for (const sub of pendingSubs) {
        session.subscribe(sub);
      }
      this._taskSubscribers.delete(taskId);
    }

    writeState({ latestTask: { id: taskId, prompt, status: "running" } });
    const result = await session.start();
    return result;
  }

  /** @param {import("./session.mjs").Session} session */
  _onSessionComplete(session) {
    const record = {
      id: session.taskId,
      prompt: session.prompt,
      status: "done",
      result: session.result || "",
      exitCode: session.exitCode ?? 0,
      usage: session.usage ?? null,
      completedAt: Date.now(),
    };
    this._completedTasks.set(session.taskId, record);
    appendCompletedTask(record);
    writeState({ latestTask: { id: session.taskId, prompt: session.prompt, status: "done", exitCode: session.exitCode } });
    this._removeSession(session.taskId);
    this._persistCount++;
    if (this._persistCount % TRIM_INTERVAL === 0) {
      trimCompletedTasks();
    }
    this._dequeueNext();
  }

  /** @param {import("./session.mjs").Session} session */
  _onSessionError(session, reason) {
    const record = {
      id: session.taskId,
      prompt: session.prompt,
      status: "failed",
      result: reason || "",
      exitCode: 1,
      usage: null,
      completedAt: Date.now(),
    };
    this._completedTasks.set(session.taskId, record);
    appendCompletedTask(record);
    writeState({ latestTask: { id: session.taskId, prompt: session.prompt, status: "failed" } });
    this._removeSession(session.taskId);
    this._dequeueNext();
  }

  /** @param {string} taskId */
  _removeSession(taskId) {
    this._sessions.delete(taskId);
  }

  /** Start the next queued task if capacity allows. */
  _dequeueNext() {
    while (this._sessions.size < this._maxConcurrent && this._pendingQueue.length > 0) {
      const item = this._pendingQueue.shift();
      if (!item) break;
      // Fire and forget — the promise resolves when session starts
      this._startSession(item.prompt, item.taskId, item.opts)
        .then((r) => item.resolve(r))
        .catch((e) => item.reject(e));
    }
  }

  /** Load persisted tasks from disk into memory cache. */
  _loadPersistedTasks() {
    try {
      const tasks = loadCompletedTasks();
      const maxCached = 500;
      const recent = tasks.slice(-maxCached);
      for (const t of recent) {
        this._completedTasks.set(t.id, t);
      }
      if (tasks.length > 0) {
        process.stderr.write(`[bridge] loaded ${tasks.length} persisted tasks (cached ${recent.length})\n`);
      }
    } catch {
      // ignore
    }
  }
}
