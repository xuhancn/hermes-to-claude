/**
 * @file StdioTransport — wraps a child process stdin/stdout as a Transport.
 *
 * Read side: parses NDJSON from child.stdout via readline.
 * Write side: SerialBatchEventUploader for ordered, batched writes to child.stdin.
 *
 * Usage:
 *   const child = spawn('node', ['cli.mjs', '--print', '--input-format', 'stream-json']);
 *   const transport = new StdioTransport(child);
 *   transport.setOnData((line) => console.log('inbound:', line));
 *   transport.connect();
 *   await transport.write({ type: 'user', message: { role: 'user', content: 'hello' } });
 */

import { createInterface } from 'readline';
import { createWriteStream } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { SerialBatchEventUploader } from './SerialBatchEventUploader.mjs';

const DEFAULT_BATCH_SIZE = 100;
const DEFAULT_QUEUE_SIZE = 10_000;
const BASE_DELAY_MS = 200;
const MAX_DELAY_MS = 4000;
const JITTER_MS = 500;

/** States a StdioTransport can be in. */
const STATE = {
  IDLE: 'idle',
  CONNECTED: 'connected',
  CLOSING: 'closing',
  CLOSED: 'closed',
};

export class StdioTransport {
  /**
   * @param {import('child_process').ChildProcess} child
   * @param {object} [opts]
   * @param {number} [opts.maxBatchSize=100] - Max items per stdin write
   * @param {number} [opts.maxQueueSize=10000] - Max pending before backpressure
   * @param {(err: Error) => void} [opts.onError] - Stderr parse error callback
   */
  constructor(child, opts = {}) {
    /** @type {import('child_process').ChildProcess} */
    this.child = child;

    /** @type {import('./types.mjs').OnDataCallback | null} */
    this._onData = null;
    /** @type {import('./types.mjs').OnCloseCallback | null} */
    this._onClose = null;
    /** @type {import('./types.mjs').OnConnectCallback | null} */
    this._onConnect = null;

    this._state = STATE.IDLE;
    this._onError = opts.onError ?? ((err) => {
      process.stderr.write(`[StdioTransport] parse error: ${err.message}\n`);
    });

    // Transcript path — set null to disable raw NDJSON dump
    this._transcriptPath = opts.transcriptPath;
    if (this._transcriptPath === undefined) {
      this._transcriptPath = join(homedir(), '.hbridge_transcript.jsonl');
    }
    // Transcript stream — opened in connect(), closed in close()
    this._transcriptStream = null;

    // Write side: SerialBatchEventUploader → child.stdin.write()
    this._uploader = new SerialBatchEventUploader({
      maxBatchSize: opts.maxBatchSize ?? DEFAULT_BATCH_SIZE,
      maxQueueSize: opts.maxQueueSize ?? DEFAULT_QUEUE_SIZE,
      baseDelayMs: BASE_DELAY_MS,
      maxDelayMs: MAX_DELAY_MS,
      jitterMs: JITTER_MS,
      send: (batch) => this._writeBatch(batch),
    });
  }

  get droppedBatchCount() {
    return this._uploader.droppedBatchCount;
  }

  // ── Transport interface ──────────────────────────────────────────────

  /**
   * Write a single message to stdin.
   * @param {import('./types.mjs').StdoutMessage} message
   * @returns {Promise<void>}
   */
  async write(message) {
    await this._uploader.enqueue(message);
  }

  /**
   * Write multiple messages as a batch (preserves order).
   * @param {import('./types.mjs').StdoutMessage[]} messages
   * @returns {Promise<void>}
   */
  async writeBatch(messages) {
    await this._uploader.enqueue(...messages);
  }

  /** Graceful close — drains pending writes then releases resources. */
  close() {
    if (this._state === STATE.CLOSED || this._state === STATE.CLOSING) return;
    this._state = STATE.CLOSING;

    this._uploader.close();

    // Close transcript file
    if (this._transcriptStream) {
      this._transcriptStream.end();
      this._transcriptStream = null;
    }

    if (this._rl) {
      this._rl.close();
      this._rl = null;
    }

    this._state = STATE.CLOSED;
    this._onClose?.(0);
  }

  /** @returns {string} */
  getStateLabel() {
    return this._state;
  }

  /** @returns {boolean} */
  isConnectedStatus() {
    return this._state === STATE.CONNECTED;
  }

  /**
   * @param {import('./types.mjs').OnDataCallback} cb
   */
  setOnData(cb) {
    this._onData = cb;
  }

  /**
   * @param {import('./types.mjs').OnCloseCallback} cb
   */
  setOnClose(cb) {
    this._onClose = cb;
  }

  /**
   * @param {import('./types.mjs').OnConnectCallback} cb
   */
  setOnConnect(cb) {
    this._onConnect = cb;
  }

  /** Initiate the connection — start reading stdout. */
  connect() {
    if (this._state !== STATE.IDLE) return;
    this._state = STATE.CONNECTED;

    // Wire up stdout NDJSON parser
    this._rl = createInterface({ input: this.child.stdout });

    // Transcript tee — raw NDJSON dump (null path = disabled)
    if (this._transcriptPath) {
      this._transcriptStream = createWriteStream(this._transcriptPath, { flags: 'a' });
      this._transcriptStream.on('error', (err) => {
        process.stderr.write(`[StdioTransport] transcript error: ${err.message}\n`);
        this._transcriptStream = null;
      });
    }

    this._rl.on('line', (line) => {
      // Tee raw NDJSON to transcript file (before parse, unfiltered)
      if (this._transcriptStream) {
        this._transcriptStream.write(line + '\n');
      }
      try {
        this._onData?.(line);
      } catch (err) {
        this._onError(
          err instanceof Error ? err : new Error(String(err))
        );
      }
    });

    // Forward child stderr to our debug output
    this.child.stderr.on('data', (d) => {
      process.stderr.write(`[claude] ${d.toString()}`);
    });

    // Handle child process exit
    this.child.on('error', (err) => {
      this._state = STATE.CLOSED;
      this._onClose?.(1);
    });

    this.child.on('close', (code) => {
      this._state = STATE.CLOSED;
      this._onClose?.(code ?? 1);
    });

    // Signal connected — the child may not be ready yet, but stdin is writable.
    this._onConnect?.();
  }

  /**
   * SSE-style sequence number (not used by stdio; always 0).
   * @returns {number}
   */
  getLastSequenceNum() {
    return 0;
  }

  // ── Internal ─────────────────────────────────────────────────────────

  /**
   * Safely JSON-stringify a message for NDJSON transport.
   * Escapes U+2028 (LINE SEPARATOR) and U+2029 (PARAGRAPH SEPARATOR)
   * which can break JavaScript readline line-splitting semantics.
   * @param {unknown} msg
   * @returns {string}
   */
  _ndjsonStringify(msg) {
    // Escape U+2028 (LINE SEPARATOR) and U+2029 (PARAGRAPH SEPARATOR)
    // to prevent Node.js readline from splitting on JavaScript
    // line-terminator characters embedded in string values.
    const str = JSON.stringify(msg);
    return str
      .replaceAll(' ', '\\u2028')
      .replaceAll(' ', '\\u2029');
  }

  /**
   * Actually write a batch of serialized JSON to stdin.
   * Called by SerialBatchEventUploader.send().
   * @param {unknown[]} batch
   * @returns {Promise<void>}
   */
  async _writeBatch(batch) {
    if (this._state === STATE.CLOSED || this._state === STATE.CLOSING) {
      return;
    }

    // Build a single string with newline-delimited JSON
    let payload = '';
    for (const msg of batch) {
      payload += this._ndjsonStringify(msg) + '\n';
    }

    return new Promise((resolve, reject) => {
      const canContinue = this.child.stdin.write(payload, (err) => {
        if (err) reject(err);
        else resolve();
      });

      // Backpressure from the kernel pipe buffer
      if (!canContinue) {
        this.child.stdin.once('drain', resolve);
      }
    });
  }
}
