/**
 * @file Shared transport-layer helpers for bridge message handling.
 *
 * Contains BoundedUUIDSet (echo-dedup ring buffer) — the only export
 * used in production. Other helpers were removed; see git history.
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
