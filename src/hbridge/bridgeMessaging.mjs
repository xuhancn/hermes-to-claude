/**
 * @file Shared transport-layer helpers for bridge message handling.
 *
 * Ported from open-claude-code src/bridge/bridgeMessaging.ts
 * (Apache 2.0 license).
 *
 * Contains pure functions — no closure over bridge-specific state.
 */

// ─── BoundedUUIDSet (echo-dedup ring buffer) ──────────────────────────

/**
 * FIFO-bounded set backed by a circular buffer. Evicts the oldest entry
 * when capacity is reached, keeping memory usage constant at O(capacity).
 *
 * Messages are added in chronological order, so evicted entries are always
 * the oldest.
 */
export class BoundedUUIDSet {
  /**
   * @param {number} capacity
   */
  constructor(capacity) {
    this.capacity = capacity;
    /** @type {(string|undefined)[]} */
    this.ring = new Array(capacity);
    this.set = new Set();
    this.writeIdx = 0;
  }

  /**
   * @param {string} uuid
   */
  add(uuid) {
    if (this.set.has(uuid)) return;
    // Evict the entry at the current write position (if occupied)
    const evicted = this.ring[this.writeIdx];
    if (evicted !== undefined) {
      this.set.delete(evicted);
    }
    this.ring[this.writeIdx] = uuid;
    this.set.add(uuid);
    this.writeIdx = (this.writeIdx + 1) % this.capacity;
  }

  /**
   * @param {string} uuid
   * @returns {boolean}
   */
  has(uuid) {
    return this.set.has(uuid);
  }

  clear() {
    this.set.clear();
    this.ring.fill(undefined);
    this.writeIdx = 0;
  }
}

// ─── Type guards ─────────────────────────────────────────────────────

/**
 * Check if a parsed value is a control_response message from the server.
 * @param {unknown} value
 * @returns {value is { type: 'control_response', response: Record<string,unknown> }}
 */
export function isControlResponse(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    value.type === 'control_response' &&
    'response' in value
  );
}

/**
 * Check if a parsed value is a control_request message from the server.
 * @param {unknown} value
 * @returns {value is { type: 'control_request', request_id: string, request: Record<string,unknown> }}
 */
export function isControlRequest(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    value.type === 'control_request' &&
    'request_id' in value &&
    'request' in value
  );
}

/**
 * Check if a message type should be forwarded via bridge transport.
 * The server (or remote client) only wants user/assistant turns and
 * command system events; everything else is internal REPL chatter.
 *
 * @param {import('./transport/types.mjs').StdoutMessage} m
 * @returns {boolean}
 */
export function isEligibleBridgeMessage(m) {
  if ((m.type === 'user' || m.type === 'assistant') && m.isVirtual) {
    return false;
  }
  return (
    m.type === 'user' ||
    m.type === 'assistant' ||
    (m.type === 'system' && m.subtype === 'local_command')
  );
}

// ─── Ingress routing ─────────────────────────────────────────────────

/**
 * Parse an ingress message and route it to the appropriate handler.
 * Ignores messages whose UUID is in recentPostedUUIDs (echoes of what we sent)
 * or in recentInboundUUIDs (re-deliveries — sequence number edge cases).
 *
 * @param {string} data - Raw NDJSON line
 * @param {BoundedUUIDSet} recentPostedUUIDs - UUIDs we've recently sent
 * @param {BoundedUUIDSet} recentInboundUUIDs - UUIDs we've recently forwarded
 * @param {(msg: import('./transport/types.mjs').StdoutMessage) => void | Promise<void>} [onMessage]
 * @param {(response: { type: 'control_response', response: Record<string,unknown> }) => void} [onControlResponse]
 * @param {(request: { type: 'control_request', request_id: string, request: Record<string,unknown> }) => void} [onControlRequest]
 */
export function handleIngressMessage(
  data,
  recentPostedUUIDs,
  recentInboundUUIDs,
  onMessage,
  onControlResponse,
  onControlRequest,
) {
  let parsed;
  try {
    parsed = JSON.parse(data);
  } catch {
    return; // skip unparseable lines
  }

  if (!parsed || typeof parsed !== 'object') return;

  // control_response — permission decisions from the remote side
  if (isControlResponse(parsed)) {
    onControlResponse?.(parsed);
    return;
  }

  // control_request — server-initiated lifecycle (initialize, set_model, etc.)
  if (isControlRequest(parsed)) {
    onControlRequest?.(parsed);
    return;
  }

  // Must be a regular message with a 'type' field
  if (typeof parsed.type !== 'string') return;

  const msg = /** @type {import('./transport/types.mjs').StdoutMessage} */ (parsed);

  // Echo detection: skip messages we recently sent
  const uuid = /** @type {string|undefined} */ (msg.uuid);
  if (uuid && recentPostedUUIDs.has(uuid)) {
    return;
  }

  // Re-delivery dedup: skip inbound prompts we've already forwarded
  if (uuid && recentInboundUUIDs.has(uuid)) {
    return;
  }

  // Track inbound UUIDs for front-end messages (user turns)
  if (msg.type === 'user' && uuid) {
    recentInboundUUIDs.add(uuid);
  }

  // Forward to the registered handler
  onMessage?.(msg);
}

// ─── FlushGate (write-ordering gate) ─────────────────────────────────

/**
 * Gates message writes during the initial history flush to prevent
 * ordering races where new messages arrive at the server interleaved
 * with history.
 *
 * - start() — begins gating; subsequent enqueue() calls buffer instead
 *   of passing through
 * - end() — stops gating and returns all buffered messages; caller
 *   should flush them after the history POST completes
 * - enqueue() — returns true if the item was buffered (gate active),
 *   false if the gate is not active (caller should send directly)
 * - drop() — discards buffered messages, returns count
 * - deactivate() — stops gating without returning buffered messages;
 *   they remain in the buffer until the next end() call
 *
 * @template T
 */
export class FlushGate {
  constructor() {
    /** @type {boolean} */
    this.active = false;
    /** @type {T[]} */
    this.buffer = [];
  }

  /**
   * Start gating. Subsequent enqueue() calls will buffer.
   */
  start() {
    this.active = true;
  }

  /**
   * Stop gating and return buffered messages.
   * @returns {T[]}
   */
  end() {
    const buf = this.buffer;
    this.buffer = [];
    this.active = false;
    return buf;
  }

  /**
   * Enqueue an item. If gate is active, buffers it and returns true.
   * If gate is not active, returns false (caller should send directly).
   * @param {...T} items
   * @returns {boolean} true if buffered, false if gate not active
   */
  enqueue(...items) {
    if (this.active) {
      this.buffer.push(...items);
      return true;
    }
    return false;
  }

  /**
   * Discard buffered messages.
   * @returns {number} number of discarded messages
   */
  drop() {
    const n = this.buffer.length;
    this.buffer = [];
    return n;
  }

  /**
   * Deactivate the gate without returning buffered messages.
   * Messages remain in the buffer for a subsequent end() call.
   */
  deactivate() {
    this.active = false;
  }
}
