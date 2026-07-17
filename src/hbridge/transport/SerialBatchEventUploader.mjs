/**
 * @file Serial ordered event uploader with batching, retry, and backpressure.
 *
 * - enqueue() adds events to a pending buffer
 * - At most 1 I/O call in-flight at a time
 * - Drains up to maxBatchSize items per call
 * - New events accumulate while in-flight
 * - On failure: exponential backoff (clamped), retries until success or close()
 * - flush() blocks until pending is empty
 * - Backpressure: enqueue() blocks when maxQueueSize is reached
 *
 * Ported from open-claude-code src/cli/transports/SerialBatchEventUploader.ts
 * (Apache 2.0 license).
 */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Throw from config.send() to make the uploader wait a server-supplied
 * duration before retrying. When retryAfterMs is set, it overrides the
 * exponential backoff for that attempt — clamped to [baseDelayMs, maxDelayMs]
 * and jittered.
 */
export class RetryableError extends Error {
  /**
   * @param {string} message
   * @param {number} [retryAfterMs]
   */
  constructor(message, retryAfterMs) {
    super(message);
    this.name = 'RetryableError';
    this.retryAfterMs = retryAfterMs;
  }
}

export class SerialBatchEventUploader {
  /**
   * @param {{
   *   maxBatchSize: number
   *   maxBatchBytes?: number
   *   maxQueueSize: number
   *   send: (batch: unknown[]) => Promise<void>
   *   baseDelayMs: number
   *   maxDelayMs: number
   *   jitterMs: number
   *   maxConsecutiveFailures?: number
   *   onBatchDropped?: (batchSize: number, failures: number) => void
   * }} config
   */
  constructor(config) {
    /** @type {unknown[]} */
    this.pending = [];
    this.pendingAtClose = 0;
    this.draining = false;
    this.closed = false;
    /** @type {Array<() => void>} */
    this.backpressureResolvers = [];
    /** @type {Array<() => void>} */
    this.flushResolvers = [];
    this.droppedBatches = 0;
    this._drainPromise = null;

    this.config = {
      maxBatchSize: config.maxBatchSize,
      maxBatchBytes: config.maxBatchBytes,
      maxQueueSize: config.maxQueueSize,
      send: config.send,
      baseDelayMs: config.baseDelayMs,
      maxDelayMs: config.maxDelayMs,
      jitterMs: config.jitterMs,
      maxConsecutiveFailures: config.maxConsecutiveFailures,
      onBatchDropped: config.onBatchDropped ?? (() => {}),
    };
  }

  /** Monotonic count of batches dropped via maxConsecutiveFailures. */
  get droppedBatchCount() {
    return this.droppedBatches;
  }

  /** Pending queue depth. After close(), returns count at close time. */
  get pendingCount() {
    return this.closed ? this.pendingAtClose : this.pending.length;
  }

  /**
   * Add events to the pending buffer. Returns immediately if space is
   * available. Blocks (awaits) if the buffer is full — caller pauses until
   * drain frees space.
   *
   * @param {...unknown} items
   * @returns {Promise<void>}
   */
  async enqueue(...items) {
    if (this.closed) return;

    // Backpressure: if the queue is too deep, block until drain clears space
    while (this.pending.length + items.length > this.config.maxQueueSize) {
      if (this.closed) return;
      await new Promise((resolve) => {
        this.backpressureResolvers.push(resolve);
      });
    }

    this.pending.push(...items);
    this._kickDrain();
  }

  /**
   * Block until all pending events are flushed. Resolves immediately when
   * nothing is pending.
   * @returns {Promise<void>}
   */
  async flush() {
    if (this.closed) return;
    // Drain may have taken items but send is still in-flight
    if (this.draining && this._drainPromise) {
      await this._drainPromise;
    }
    if (this.pending.length === 0) return;
    await new Promise((resolve) => {
      this.flushResolvers.push(resolve);
    });
  }

  /**
   * Stop accepting new events and release resources. Best-effort drain of
   * any remaining pending events.
   */
  close() {
    if (this.closed) return;
    this.closed = true;
    this.pendingAtClose = this.pending.length;
    this.pending = [];

    // Release any blocked callers — they'll see closed and return
    for (const resolve of this.backpressureResolvers) {
      resolve();
    }
    this.backpressureResolvers = [];

    // Release any flush waiters
    for (const resolve of this.flushResolvers) {
      resolve();
    }
    this.flushResolvers = [];
  }

  // ---------------------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------------------

  /** Start the drain loop if not already running. */
  _kickDrain() {
    if (this.draining || this.closed) return;
    this.draining = true;
    // Fire-and-forget — the loop owns its lifecycle
    this._drainPromise = this._drainLoop();
  }

  async _drainLoop() {
    while (!this.closed && this.pending.length > 0) {
      // Snapshot a batch (atomically)
      const batch = this._takeBatch();
      if (batch.length === 0) break;

      let consecutiveFailures = 0;
      let success = false;

      while (!success && !this.closed) {
        try {
          await this.config.send(batch);
          success = true;
        } catch (err) {
          consecutiveFailures++;

          // Check if we should drop this batch
          const maxFail = this.config.maxConsecutiveFailures;
          if (maxFail !== undefined && consecutiveFailures > maxFail) {
            this.droppedBatches++;
            this.config.onBatchDropped(batch.length, consecutiveFailures);
            // Drop the batch and advance to the next one
            break;
          }

          // Determine retry delay
          let delayMs = this._backoffDelay(consecutiveFailures);
          if (err instanceof RetryableError && err.retryAfterMs !== undefined) {
            // Server-supplied delay, clamped and jittered
            const clamped = Math.max(
              this.config.baseDelayMs,
              Math.min(err.retryAfterMs, this.config.maxDelayMs)
            );
            delayMs = clamped + (Math.random() - 0.5) * this.config.jitterMs;
          }

          await sleep(Math.max(0, delayMs));
        }
      }

      // Release backpressure waiters proportional to available space
      this._releaseBackpressure();
    }

    this.draining = false;

    // Final flush of any remaining waiters (empty = resolved already)
    for (const resolve of this.flushResolvers) {
      resolve();
    }
    this.flushResolvers = [];
  }

  /**
   * Take up to maxBatchSize (and maxBatchBytes) items from the pending buffer.
   * @returns {unknown[]}
   */
  _takeBatch() {
    const maxSize = this.config.maxBatchSize;
    const maxBytes = this.config.maxBatchBytes;
    const batch = [];

    for (let i = 0; i < maxSize && this.pending.length > 0; i++) {
      const item = this.pending.shift();

      // Check byte budget (first item always fits)
      if (maxBytes !== undefined && batch.length > 0) {
        const itemStr = JSON.stringify(item);
        const batchStr = JSON.stringify(batch) + ',' + itemStr;
        if (new TextEncoder().encode(batchStr).length > maxBytes) {
          // Put it back — it'll be in the next batch
          this.pending.unshift(item);
          break;
        }
      }

      batch.push(item);
    }

    return batch;
  }

  /**
   * Exponential backoff with jitter.
   * @param {number} attempt - 1-indexed attempt count
   * @returns {number} delay in ms
   */
  _backoffDelay(attempt) {
    const base = Math.min(
      this.config.baseDelayMs * Math.pow(2, attempt - 1),
      this.config.maxDelayMs
    );
    // ±50% jitter
    const jitter = (Math.random() - 0.5) * this.config.jitterMs;
    return Math.max(0, base + jitter);
  }

  /** Wake up backpressure waiters now that space has freed. */
  _releaseBackpressure() {
    const free = this.config.maxQueueSize - this.pending.length;
    const toRelease = Math.min(free, this.backpressureResolvers.length);
    for (let i = 0; i < toRelease; i++) {
      const resolve = this.backpressureResolvers.shift();
      resolve?.();
    }
  }
}
