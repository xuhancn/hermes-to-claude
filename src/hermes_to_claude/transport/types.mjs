/**
 * @file Transport layer type definitions.
 *
 * All types are JSDoc typedefs — pure documentation, zero runtime cost.
 * The actual codebase is ESM .mjs; these serve as the shared contract.
 */

/**
 * @typedef {Object} StdoutMessage
 * A message that flows through a Transport connection.
 * Shape varies by message type (user, assistant, stream_event, keep_alive, etc.).
 * @property {string} type
 * @property {string} [subtype]
 * @property {string} [uuid]
 * @property {string} [session_id]
 */

/**
 * @typedef {Object} StreamClientEvent
 * Payload for `event: client_event` SSE frames (CCR v2 protocol).
 * @property {string} event_id
 * @property {number} sequence_num
 * @property {string} event_type
 * @property {string} source
 * @property {Record<string,unknown>} payload
 * @property {string} created_at
 */

/**
 * @callback OnDataCallback
 * @param {string} data - raw NDJSON line from the read side
 * @returns {void}
 */

/**
 * @callback OnCloseCallback
 * @param {number} [code] - close code (HTTP status or WS code)
 * @returns {void}
 */

/**
 * @callback OnConnectCallback
 * @returns {void}
 */

/**
 * @callback RefreshHeadersFn
 * @returns {Record<string,string>}
 */

/**
 * Transport — abstract I/O wrapper.
 *
 * Hides the read/write mechanism from higher layers:
 * - StdioTransport — child process stdin/stdout
 * - HybridTransport (future) — WebSocket reads + HTTP POST writes
 * - SSETransport (future) — SSE reads + CCR v2 writes
 *
 * @typedef {Object} Transport
 * @property {(message: StdoutMessage) => Promise<void>} write
 *   Write a single message. Resolves when the message is enqueued (not necessarily
 *   flushed to the wire). Fire-and-forget callers use `void transport.write()`.
 * @property {(messages: StdoutMessage[]) => Promise<void>} writeBatch
 *   Write multiple messages in a single batch (preserves order). Resolves when all
 *   messages are enqueued.
 * @property {() => void} close
 *   Graceful close — drains pending writes before releasing resources.
 *   Can be called multiple times; second+ are no-ops.
 * @property {() => string} getStateLabel
 *   Current state label for debug logging: 'idle' | 'connected' | 'reconnecting' | 'closing' | 'closed'
 * @property {() => boolean} isConnectedStatus
 *   True when the transport is ready for reads and writes.
 * @property {(cb: OnDataCallback) => void} setOnData
 *   Register the inbound data callback. Called once per NDJSON line.
 *   @param {OnDataCallback} cb
 * @property {(cb: OnCloseCallback) => void} setOnClose
 *   Register the close callback. Called when the transport permanently closes.
 *   @param {OnCloseCallback} cb
 * @property {(cb: OnConnectCallback) => void} setOnConnect
 *   Register the connect callback. Called when the transport first becomes ready.
 *   @param {OnConnectCallback} cb
 * @property {() => void} connect
 *   Initiate the connection. After this, setOnData/setOnClose will fire.
 * @property {() => number} getLastSequenceNum
 *   High-water mark of read sequence numbers. Used to resume from a saved position
 *   after transport swap (SSE/CCR v2 only; StdioTransport returns 0).
 * @property {number} droppedBatchCount
 *   Monotonic count of batches dropped via maxConsecutiveFailures.
 *   Snapshot before writeBatch() and compare after to detect silent drops.
 */

/**
 * SerialBatchEventUploader config.
 *
 * @typedef {Object} UploaderConfig
 * @property {number} maxBatchSize - Max items per POST (1 = no batching)
 * @property {number} [maxBatchBytes] - Max serialized bytes per POST
 * @property {number} maxQueueSize - Max pending items before enqueue() blocks
 * @property {(batch: StdoutMessage[]) => Promise<void>} send - Actual I/O call
 * @property {number} baseDelayMs - Base delay for exponential backoff
 * @property {number} maxDelayMs - Max delay cap
 * @property {number} jitterMs - Random jitter range added to retry delay
 * @property {number} [maxConsecutiveFailures] - Drop batch after N consecutive failures
 * @property {(batchSize: number, failures: number) => void} [onBatchDropped] - Called when a batch is dropped
 */

export default {}
