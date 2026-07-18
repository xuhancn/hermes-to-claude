#!/usr/bin/env node
/**
 * Comprehensive unit tests for transport layer + bridge messaging.
 *
 * Run: node src/hbridge/transport/__tests__/run-all.mjs
 * No test framework required — plain assertions with descriptive output.
 */

let passed = 0
let failed = 0
let group = ''

function describe(name) { group = name; process.stderr.write(`\n  ${name}\n`) }
function assert(condition, msg) {
  if (condition) { passed++; return }
  failed++
  process.stderr.write(`    ✖ FAIL [${group}] ${msg}\n`)
}
async function assertRejects(fn, msg) {
  try { await fn(); failed++; process.stderr.write(`    ✖ FAIL [${group}] ${msg} — expected reject, got resolve\n`) }
  catch { passed++ }
}
function assertThrows(fn, msg) {
  try { fn(); failed++; process.stderr.write(`    ✖ FAIL [${group}] ${msg} — expected throw, got none\n`) }
  catch { passed++ }
}

const sleep = ms => new Promise(r => setTimeout(r, ms))

// ===================================================================
// Phase 1 — SerialBatchEventUploader
// ===================================================================

import { SerialBatchEventUploader, RetryableError } from '../SerialBatchEventUploader.mjs'

describe('SerialBatchEventUploader — basic enqueue + flush')
{
  const sent = []
  const u = new SerialBatchEventUploader({
    maxBatchSize: 10, maxQueueSize: 100, baseDelayMs: 5, maxDelayMs: 50, jitterMs: 0,
    send: async batch => { sent.push(...batch) },
  })
  await u.enqueue(1, 2, 3)
  await u.flush()
  assert(sent.length === 3, `flush delivered 3 items, got ${sent.length}`)
  assert(sent[0] === 1 && sent[1] === 2 && sent[2] === 3, 'items in order')
}

describe('SerialBatchEventUploader — batching by maxBatchSize')
{
  const batches = []
  const u = new SerialBatchEventUploader({
    maxBatchSize: 3, maxQueueSize: 100, baseDelayMs: 5, maxDelayMs: 50, jitterMs: 0,
    send: async batch => { batches.push(batch) },
  })
  await u.enqueue(1, 2, 3, 4, 5)
  await u.flush()
  assert(batches.length >= 2, `batched into ${batches.length} batches`)
  assert(batches[0].length <= 3, `first batch size ${batches[0].length} ≤ 3`)
  assert(batches.flat().length === 5, 'all 5 items delivered')
}

describe('SerialBatchEventUploader — maxBatchBytes')
{
  const batches = []
  const u = new SerialBatchEventUploader({
    maxBatchSize: 10, maxBatchBytes: 20, maxQueueSize: 100,
    baseDelayMs: 5, maxDelayMs: 50, jitterMs: 0,
    send: async batch => { batches.push(batch) },
  })
  await u.enqueue({ data: 'hello world this is long' }, { data: 'short' })
  await u.flush()
  assert(batches.length >= 2, 'split into multiple batches by byte limit')
  assert(batches.flat().length === 2, 'both items delivered')
}

describe('SerialBatchEventUploader — backpressure when queue full')
{
  const writes = []
  const u = new SerialBatchEventUploader({
    maxBatchSize: 1, maxQueueSize: 2, baseDelayMs: 5, maxDelayMs: 50, jitterMs: 0,
    send: async batch => { await sleep(80); writes.push(...batch) },
  })
  // Send is slow (200ms) — drain loop will be busy while we fill the queue
  const p1 = u.enqueue('a') // drain starts, send 'a' (200ms)
  await sleep(50)            // drain has taken 'a'
  await u.enqueue('b')       // pending = ['b']
  // Queue has 1 free slot left (max 2, 1 pending)
  let unblocked = false
  await u.enqueue('c')       // pending = ['b','c'] = 2, next enqueue must backpressure
  // Try another enqueue — should block
  const p4 = u.enqueue('d').then(() => { unblocked = true })
  await sleep(100)
  // 'a' hasn't finished yet (200ms total, 150ms elapsed), so no slot freed
  assert(!unblocked, 'enqueue blocked when queue full')
  // Wait for 'a' to finish → drain takes 'b' → 1 free slot → 'd' enqueues
  await sleep(400)
  assert(unblocked, 'enqueue unblocked after drain frees space')
  assert(writes.length === 4, `all 4 items delivered, got ${writes.length}`)
}

describe('SerialBatchEventUploader — retry then success')
{
  let attempts = 0
  const sent = []
  const u = new SerialBatchEventUploader({
    maxBatchSize: 10, maxQueueSize: 100, baseDelayMs: 5, maxDelayMs: 50, jitterMs: 0,
    send: async batch => {
      attempts++
      if (attempts <= 2) { await sleep(10); throw new Error('transient') }
      sent.push(...batch)
    },
  })
  await u.enqueue('x')
  await sleep(200) // wait for retries to complete
  await u.flush()
  assert(attempts === 3, `retried ${attempts} times, expected 3`)
  assert(sent.length === 1, 'item delivered after retry')
}

describe('SerialBatchEventUploader — maxConsecutiveFailures drops batch')
{
  const drops = []
  const u = new SerialBatchEventUploader({
    maxBatchSize: 2, maxQueueSize: 100, baseDelayMs: 5, maxDelayMs: 10, jitterMs: 0,
    maxConsecutiveFailures: 2, onBatchDropped: (s, f) => drops.push({ s, f }),
    send: async () => { throw new Error('always fail') },
  })
  await u.enqueue(1, 2, 3)
  await sleep(400)
  assert(drops.length >= 1, `batch dropped, got ${drops.length} drop events`)
  assert(drops[0].s === 2, `dropped batch size 2, got ${drops[0].s}`)
}

describe('SerialBatchEventUploader — close drops pending')
{
  const sent = []
  const u = new SerialBatchEventUploader({
    maxBatchSize: 10, maxQueueSize: 100, baseDelayMs: 50, maxDelayMs: 100, jitterMs: 0,
    send: async batch => { await sleep(300); sent.push(...batch) },
  })
  await u.enqueue('a', 'b')
  await sleep(20) // drain takes 'a','b', starts slow send
  u.close()
  // close() stops the drain loop
  // note: close doesn't abort in-flight send; just clears pending
  assert(u.pendingCount === 0, 'close clears pending')
  // Wait and verify no more items arrive (drain was stopped)
  await sleep(100)
  // The in-flight send MAY still complete (it was already started), that's fine
}

describe('SerialBatchEventUploader — droppedBatchCount')
{
  const u = new SerialBatchEventUploader({
    maxBatchSize: 1, maxQueueSize: 100, baseDelayMs: 50, maxDelayMs: 100, jitterMs: 0,
    maxConsecutiveFailures: 1, send: async () => { await sleep(10); throw new Error('fail') },
  })
  assert(u.droppedBatchCount === 0, 'starts at 0')
  await u.enqueue(1, 2)
  await sleep(500)
  assert(u.droppedBatchCount > 0, `incremented to ${u.droppedBatchCount}`)
}

describe('SerialBatchEventUploader — RetryableError with server-supplied delay')
{
  const timestamps = []
  const u = new SerialBatchEventUploader({
    maxBatchSize: 1, maxQueueSize: 100, baseDelayMs: 50, maxDelayMs: 200, jitterMs: 0,
    send: async () => { await sleep(10); timestamps.push(Date.now()); throw new RetryableError('backoff', 100) },
    maxConsecutiveFailures: 2,
  })
  await u.enqueue('x')
  await sleep(800)
  assert(timestamps.length >= 2, 'retried at least twice')
}

// ===================================================================
// Phase 1 — BoundedUUIDSet
// ===================================================================

import { BoundedUUIDSet, FlushGate, isEligibleBridgeMessage, isControlResponse, isControlRequest, handleIngressMessage } from '../../bridgeMessaging.mjs'

describe('BoundedUUIDSet — basic add/has/eviction')
{
  const s = new BoundedUUIDSet(3)
  assert(!s.has('a'), 'empty set has nothing')
  s.add('a'); s.add('b'); s.add('c')
  assert(s.has('a') && s.has('b') && s.has('c'), 'all 3 fit in capacity 3')
  s.add('d') // evicts 'a'
  assert(!s.has('a'), 'oldest evicted after capacity')
  assert(s.has('d'), 'newest present')
}

describe('BoundedUUIDSet — duplicate add is no-op')
{
  const s = new BoundedUUIDSet(3)
  s.add('x')
  s.add('x') // duplicate — should NOT consume a slot
  // fill remaining 2 slots
  s.add('y')
  s.add('z')
  // All 3 slots filled: x, y, z
  s.add('w') // evicts oldest (x)
  // If duplicate 'x' consumed a slot, capacity would have been exceeded at y
  // Only assertion: no crash, set is internally consistent
  assert(s.has('w'), 'newest present')
  assert(!s.has('x'), 'oldest evicted')
}

describe('BoundedUUIDSet — clear')
{
  const s = new BoundedUUIDSet(5)
  s.add('a'); s.add('b'); s.clear()
  assert(!s.has('a') && !s.has('b'), 'empty after clear')
  assert(s.set.size === 0, 'internal set empty')
}

// ===================================================================
// Phase 1 — Type guards + isEligibleBridgeMessage
// ===================================================================

describe('isEligibleBridgeMessage')
{
  assert(isEligibleBridgeMessage({ type: 'user' }), 'user is eligible')
  assert(isEligibleBridgeMessage({ type: 'assistant' }), 'assistant is eligible')
  assert(isEligibleBridgeMessage({ type: 'system', subtype: 'local_command' }), 'local_command eligible')
  assert(!isEligibleBridgeMessage({ type: 'system' }), 'system without subtype not eligible')
  assert(!isEligibleBridgeMessage({ type: 'result' }), 'result not eligible')
  assert(!isEligibleBridgeMessage({ type: 'user', isVirtual: true }), 'virtual user not eligible')
  assert(!isEligibleBridgeMessage({ type: 'assistant', isVirtual: true }), 'virtual assistant not eligible')
}

describe('isControlResponse')
{
  assert(isControlResponse({ type: 'control_response', response: {} }), 'valid control_response')
  assert(!isControlResponse({ type: 'user' }), 'user is not control_response')
  assert(!isControlResponse(null), 'null is not control_response')
  assert(!isControlResponse({}), 'no type field is not control_response')
}

describe('isControlRequest')
{
  assert(isControlRequest({ type: 'control_request', request_id: 'r1', request: {} }), 'valid control_request')
  assert(!isControlRequest({ type: 'control_response', response: {} }), 'control_response not request')
  assert(!isControlRequest({ type: 'control_request' }), 'missing request_id is not control_request')
}

// ===================================================================
// Phase 1 — handleIngressMessage
// ===================================================================

describe('handleIngressMessage — routing')
{
  const posted = new BoundedUUIDSet(10)
  const inbound = new BoundedUUIDSet(10)
  let lastMsg = null, lastCR = null, lastCRq = null

  // User message
  handleIngressMessage(
    JSON.stringify({ type: 'user', uuid: 'u1', message: { role: 'user', content: 'hi' } }),
    posted, inbound,
    m => lastMsg = m,
    r => lastCR = r,
    r => lastCRq = r,
  )
  assert(lastMsg?.type === 'user', 'user message routed to onMessage')
  assert(inbound.has('u1'), 'user UUID tracked')

  // Echo — same UUID as posted
  posted.add('u1')
  lastMsg = null
  handleIngressMessage(
    JSON.stringify({ type: 'user', uuid: 'u1' }),
    posted, inbound,
    m => lastMsg = m,
  )
  assert(lastMsg === null, 'echo message filtered (UUID matches posted)')

  // control_response
  handleIngressMessage(
    JSON.stringify({ type: 'control_response', response: { subtype: 'success' } }),
    posted, inbound,
    undefined,
    r => lastCR = r,
  )
  assert(lastCR?.type === 'control_response', 'control_response routed')

  // control_request
  handleIngressMessage(
    JSON.stringify({ type: 'control_request', request_id: 'r1', request: { subtype: 'initialize' } }),
    posted, inbound,
    undefined, undefined,
    r => lastCRq = r,
  )
  assert(lastCRq?.request_id === 'r1', 'control_request routed')

  // Invalid JSON
  lastMsg = null
  handleIngressMessage('not json', posted, inbound, m => lastMsg = m)
  assert(lastMsg === null, 'invalid JSON silently ignored')

  // Non-object JSON
  handleIngressMessage('"string"', posted, inbound, m => lastMsg = m)
  assert(lastMsg === null, 'non-object JSON ignored')
}

// ===================================================================
// Phase 2 — FlushGate
// ===================================================================

describe('FlushGate — basic lifecycle')
{
  const g = new FlushGate()
  assert(!g.active, 'starts inactive')
  assert(g.enqueue('a') === false, 'enqueue returns false when inactive')

  g.start()
  assert(g.active, 'active after start')
  assert(g.enqueue('b') === true, 'enqueue returns true when active')
  g.enqueue('c')

  const buf = g.end()
  assert(!g.active, 'inactive after end')
  assert(buf.length === 2, 'end returns buffered items')
  assert(buf[0] === 'b' && buf[1] === 'c', 'items in order')
}

describe('FlushGate — drop discards buffer')
{
  const g = new FlushGate()
  g.start()
  g.enqueue('x', 'y')
  const n = g.drop()
  assert(n === 2, `drop returns count ${n}`)
  assert(g.end().length === 0, 'buffer empty after drop')
}

describe('FlushGate — deactivate without losing buffer')
{
  const g = new FlushGate()
  g.start(); g.enqueue('keep')
  g.deactivate()
  assert(!g.active, 'deactivated')
  const buf = g.end()
  assert(buf.length === 1, 'buffer preserved after deactivate')
}

describe('FlushGate — multiple start/end cycles')
{
  const g = new FlushGate()
  g.start(); g.enqueue('a'); assert(g.end().length === 1, 'first cycle')
  g.start(); g.enqueue('b'); assert(g.end().length === 1, 'second cycle')
  g.start(); g.enqueue('c'); assert(g.end().length === 1, 'third cycle')
}

// ===================================================================
// Phase 1 — StdioTransport (unit with mocked child)
// ===================================================================

import { StdioTransport } from '../StdioTransport.mjs'
import { EventEmitter } from 'events'
import { Readable } from 'stream'

function mockChild() {
  const c = new EventEmitter()
  c.stdin = new EventEmitter()
  c.stdin.write = (data, cb) => { if (cb) process.nextTick(cb); return true }
  c.stdout = new Readable({ read: () => {} })
  c.stderr = new Readable({ read: () => {} })
  c.killed = false
  return c
}

function emitLine(readable, line) {
  readable.push(line + '\n')
}

describe('StdioTransport — lifecycle')
{
  const child = mockChild()
  const t = new StdioTransport(child)

  assert(t.getStateLabel() === 'idle', 'starts idle')
  assert(!t.isConnectedStatus(), 'not connected')

  let dataReceived = null
  t.setOnData(line => { dataReceived = line })
  t.connect()
  assert(t.isConnectedStatus(), 'connected after connect()')
  await sleep(20) // let readline settle

  // Simulate stdout line via stream push
  emitLine(child.stdout, '{"type":"user"}')
  await sleep(20)
  assert(dataReceived === '{"type":"user"}', `onData receives stdout lines, got "${dataReceived}"`)
}

describe('StdioTransport — write + writeBatch')
{
  const child = mockChild()
  const t = new StdioTransport(child)
  t.connect()

  let written = ''
  child.stdin.write = (data, cb) => { written += data; if (cb) process.nextTick(cb); return true }

  await t.write({ type: 'user', content: 'hello' })
  await t.write({ type: 'assistant', content: 'world' })
  await sleep(100) // drain loop flushes

  assert(written.includes('hello'), 'write sends to stdin')
  assert(written.includes('world'), 'second write sends to stdin')
}

describe('StdioTransport — close lifecycle')
{
  const child = mockChild()
  const t = new StdioTransport(child)
  t.connect()

  let closeCalled = false
  t.setOnClose(code => { closeCalled = true })
  await sleep(20)
  t.close()
  await sleep(20)
  assert(closeCalled, 'onClose fires on close()')
  assert(t.getStateLabel() === 'closed', `state is closed, got "${t.getStateLabel()}"`)
}

describe('StdioTransport — child exit triggers onClose')
{
  const child = mockChild()
  const t = new StdioTransport(child)
  let closeCode = null
  t.setOnClose(code => { closeCode = code })
  t.connect()
  child.emit('close', 42)
  assert(closeCode === 42, 'onClose fires with child exit code')
}

describe('StdioTransport — transcript file creation')
{
  const tmpDir = '/tmp'
  const child = mockChild()
  const t = new StdioTransport(child, {
    debugFile: '/tmp/debug.log',
    transcriptLabel: 'ut-test',
  })
  t.connect()
  assert(t._transcriptStream !== null, 'transcript stream created')
  t.close()
  assert(t._transcriptStream === null, 'transcript stream cleaned on close')
}

// ===================================================================
// Phase 5 — Session (message routing with mocked transport)
// ===================================================================

import { Session } from '../../session.mjs'
import { Bridge } from '../../bridge.mjs'

// ── Helper: create a Session with a mocked transport ────────────────────
function createMockSession(taskId, prompt) {
  const s = new Session({ taskId, prompt })
  s.transport = { write: async () => {}, writeBatch: async () => {}, close: () => {} }
  return s
}

describe('Session — task lifecycle with mocked transport')
{
  const s = createMockSession('t-lifecycle', 'test')
  s.status = 'running' // bypass start() — test message routing directly
  s._onMessage({ type: 'assistant', message: { content: [{ type: 'text', text: 'Hello ' }] } })
  assert(s.result === 'Hello ', 'text accumulated')
  s._onMessage({ type: 'assistant', message: { content: [{ type: 'text', text: 'World' }] } })
  assert(s.result === 'Hello World', 'text concatenated')
  s._onMessage({ stop_reason: 'end_turn' })
  assert(s.status === 'done', 'task marked done after stop_reason')
  assert(s.result === 'Hello World', 'result preserved')
}

describe('Session — UUID dedup')
{
  const s = createMockSession('t-dedup', 'test')
  s._onMessage({ type: 'assistant', uuid: 'same-uuid', message: { content: [{ type: 'text', text: 'first' }] } })
  assert(s.result === 'first', 'first message processed')
  s._onMessage({ type: 'assistant', uuid: 'same-uuid', message: { content: [{ type: 'text', text: 'dup' }] } })
  assert(s.result === 'first', 'duplicate UUID ignored')
}

describe('Session — text blocks without content array')
{
  const s = createMockSession('t-content-alt', 'test')
  s._onMessage({ role: 'assistant', content: [{ type: 'text', text: 'alt format' }] })
  assert(s.result === 'alt format', '{role, content} works')
}

describe('Session — subscribeTask + streaming events')
{
  const s = createMockSession('t-stream', 'test')
  const chunks = []
  const sub = { write: d => chunks.push(d) }
  s.subscribe(sub)
  s._onMessage({ type: 'assistant', message: { content: [{ type: 'text', text: 'chunk1' }] } })
  s._onMessage({ type: 'assistant', message: { content: [{ type: 'text', text: 'chunk2' }] } })
  s._onMessage({ stop_reason: 'end_turn' })

  assert(chunks.length >= 3, `got ${chunks.length} events (chunks + done)`)
  assert(chunks[0].startsWith('data:'), 'SSE format: data: prefix')
  assert(chunks[0].includes('chunk1'), 'first chunk emitted')
  assert(chunks.some(c => c.includes('"done"')), 'done event emitted')
  assert(s._subscribers.size === 0, 'subscribers cleaned up after done')
}

describe('Session — subscribe with error')
{
  const s = createMockSession('t-err', 'test')
  const chunks = []
  s.subscribe({ write: d => chunks.push(d) })
  s._failTask('something broke')
  assert(chunks.some(c => c.includes('"error"')), 'error event emitted')
  assert(chunks.some(c => c.includes('something broke')), 'error reason in payload')
  assert(s._subscribers.size === 0, 'subscribers cleaned after error')
}

describe('Session — unsubscribe')
{
  const s = createMockSession('t-unsub', 'test')
  const sub = { write: () => {} }
  s.subscribe(sub)
  assert(s._subscribers.has(sub), 'subscribed')
  s.unsubscribe(sub)
  assert(!s._subscribers.has(sub), 'unsubscribed')
  s.unsubscribe(sub) // no-op
  assert(true, 'double unsubscribe does not throw')
}

describe('Session — keep_alive message is silently ignored')
{
  const s = createMockSession('t-ka', 'test')
  s.result = 'existing'
  s._onMessage({ type: 'keep_alive' })
  assert(s.result === 'existing', 'result not modified by keep_alive')
}

describe('Session — keep_alive with no task does not throw')
{
  const s = createMockSession('t-ka2', 'test')
  s._onMessage({ type: 'keep_alive' })
  assert(true, 'keep_alive with no subscribers does not throw')
}

describe('Session — system/init is ignored')
{
  const s = createMockSession('t-init', 'test')
  s._onMessage({ type: 'system', subtype: 'init', session_id: 'sess-abc' })
  assert(true, 'system/init does not throw')
}

describe('Session — stream_event accumulates text deltas')
{
  const s = createMockSession('t-se', 'test')
  s._onMessage({
    type: 'stream_event',
    event: { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Hello ' } },
  })
  assert(s.result === 'Hello ', 'first delta accumulated')
  s._onMessage({
    type: 'stream_event',
    event: { type: 'content_block_delta', delta: { type: 'text_delta', text: 'World' } },
  })
  assert(s.result === 'Hello World', 'second delta concatenated')
}

describe('Session — stream_event ignores non-text deltas')
{
  const s = createMockSession('t-se-ignore', 'test')
  s._onMessage({
    type: 'stream_event',
    event: { type: 'content_block_delta', delta: { type: 'input_json_delta', partial: '{}' } },
  })
  assert(s.result === '', 'non-text delta ignored')
  s._onMessage({
    type: 'stream_event',
    event: { type: 'content_block_start' },
  })
  assert(s.result === '', 'event without delta ignored')
}

describe('Session — stream_event with no subscribers does not throw')
{
  const s = createMockSession('t-se-null', 'test')
  s._onMessage({
    type: 'stream_event',
    event: { type: 'content_block_delta', delta: { type: 'text_delta', text: 'should not crash' } },
  })
  assert(true, 'stream_event with no task does not throw')
}

describe('Session — U+2028 line separator in JSON')
{
  const LS = String.fromCharCode(0x2028)
  const s = createMockSession('t-2028', 'test')
  s._onMessage({ type: 'assistant', message: { content: [{ type: 'text', text: 'before' + LS + 'after' }] } })
  assert(s.result.includes('before'), 'text before U+2028 preserved')
  assert(s.result.includes('after'), 'text after U+2028 preserved')
  assert(s.result.includes(LS), 'U+2028 preserved in result')
}

describe('Session — U+2029 paragraph separator in JSON')
{
  const PS = String.fromCharCode(0x2029)
  const s = createMockSession('t-2029', 'test')
  s._onMessage({ type: 'assistant', message: { content: [{ type: 'text', text: 'line1' + PS + 'line2' }] } })
  assert(s.result.includes('line1'), 'text before U+2029 preserved')
  assert(s.result.includes('line2'), 'text after U+2029 preserved')
  assert(s.result.includes(PS), 'U+2029 preserved in result')
}

describe('Session — NDJSON guard: valid JSON reaches handler')
{
  const s = createMockSession('t-ndjson', 'test')
  s._onMessage({ type: 'assistant', message: { content: [{ type: 'text', text: 'valid' }] } })
  assert(s.result.includes('valid'), 'valid JSON still reaches onMessage')
}

describe('Session — control_request: respond with control_response')
{
  let lastWritten = null
  const s = new Session({ taskId: 't-cr', prompt: 'test' })
  s.transport = { write: async (msg) => { lastWritten = msg }, close: () => {} }
  s._onMessage({ type: 'control_request', request_id: 'r1', request: { subtype: 'initialize' } })
  assert(lastWritten !== null, 'control_response was sent')
  assert(lastWritten.type === 'control_response', 'response type is control_response')
  assert(lastWritten.response_id === 'r1', 'response_id matches request_id')
  assert(lastWritten.response.subtype === 'success', 'response subtype is success')
}

describe('Session — control_request: missing fields handled gracefully')
{
  let lastWritten = null
  const s = new Session({ taskId: 't-cr2', prompt: 'test' })
  s.transport = { write: async (msg) => { lastWritten = msg }, close: () => {} }
  s._onMessage({ type: 'control_request' })
  assert(lastWritten === null || lastWritten.type === 'control_response',
    'missing request_id does not crash')
}

describe('Session — session_state_changed: idle finishes task')
{
  const s = createMockSession('t-session', 'test')
  s._onMessage({ type: 'session_state_changed', state: 'idle' })
  assert(s.status === 'done', 'task finished after session idle')
}

describe('Session — session_state_changed: non-idle state is no-op')
{
  const s = createMockSession('t-session2', 'test')
  s._onMessage({ type: 'session_state_changed', state: 'thinking' })
  assert(s.status !== 'done', 'task not finished for non-idle state')
}

describe('Session — tool_use block captured in result')
{
  const s = createMockSession('t-tool-use', 'test')
  s._onMessage({
    type: 'assistant',
    message: {
      content: [
        { type: 'text', text: 'Calling tool...' },
        { type: 'tool_use', name: 'read_file', input: { path: '/tmp/x' } },
      ],
    },
  })
  assert(s.result.includes('Calling tool...'), 'text preserved')
  assert(s.result.includes('read_file'), 'tool_use name captured')
  assert(s.result.includes('/tmp/x'), 'tool_use input captured')
  assert(s.result.includes('tool_use'), 'tool_use tag present')
}

describe('Session — tool_result block captured in result')
{
  const s = createMockSession('t-tool-res', 'test')
  s._onMessage({
    type: 'assistant',
    message: {
      content: [
        { type: 'text', text: 'Result: ' },
        { type: 'tool_result', content: 'file contents here', tool_use_id: 'call_1' },
      ],
    },
  })
  assert(s.result.includes('Result:'), 'text preserved')
  assert(s.result.includes('file contents here'), 'tool_result string content captured')
  assert(s.result.includes('tool_result'), 'tool_result tag present')
}

describe('Session — tool_result with array content blocks')
{
  const s = createMockSession('t-tool-res-arr', 'test')
  s._onMessage({
    type: 'assistant',
    message: {
      content: [
        { type: 'tool_result', content: [{ type: 'text', text: 'multi' }, { type: 'text', text: 'block' }] },
      ],
    },
  })
  assert(s.result.includes('multi'), 'first sub-block text')
  assert(s.result.includes('block'), 'second sub-block text')
  assert(!s.result.includes('[object Object]'), 'no raw objects in result')
}

describe('Session — tool_use + tool_result: progressive text')
{
  const s = createMockSession('t-tool-prog', 'test')
  s._onMessage({ type: 'assistant', message: { content: [{ type: 'text', text: 'Step 1' }] } })
  s._onMessage({ type: 'assistant', message: { content: [{ type: 'text', text: 'Step 1 done' }] } })
  assert(s.result.includes('Step 1 done'), 'progressive text accumulated')
  s._onMessage({
    type: 'assistant',
    message: { id: 'msg-2', content: [{ type: 'text', text: 'Calling tool' }, { type: 'tool_use', name: 'read', input: {} }] },
  })
  assert(s.result.includes('Calling tool'), 'text with tool_use captured')
  assert(s.result.includes('read'), 'tool_use name captured in progressive stream')
}

describe('Session — tool_progress forwarding to subscribers')
{
  const s = createMockSession('t-tool-prog2', 'test')
  const events = []
  s.subscribe({ write: d => events.push(d) })
  s._onMessage({ type: 'tool_progress', tool_name: 'Bash', tool_use_id: 'tu1', elapsed_time_seconds: 1.5 })
  assert(events.some(e => e.includes('tool_progress')), 'tool_progress forwarded to subscribers')
}

describe('Session — auth_status does not throw')
{
  const s = createMockSession('t-auth', 'test')
  s._onMessage({ type: 'auth_status', isAuthenticating: true })
  s._onMessage({ type: 'auth_status', isAuthenticating: false, error: 'cancelled' })
  assert(true, 'auth_status handled without error')
}

describe('Session — rate_limit_event does not throw')
{
  const s = createMockSession('t-rate', 'test')
  s._onMessage({ type: 'rate_limit_event', rate_limit_info: { status: 'exceeded' } })
  assert(true, 'rate_limit_event handled without error')
}

describe('Session — cancel before start')
{
  const s = createMockSession('t-cancel', 'test')
  const result = s.cancel()
  assert(result === false, 'cancel returns false for non-running session')
}

describe('Session — _finishTask sets done status')
{
  const s = createMockSession('t-finish', 'test')
  s._finishTask(0)
  assert(s.status === 'done', 'status done after _finishTask')
  assert(s.exitCode === 0, 'exitCode 0 after _finishTask')
}

describe('Session — _failTask sets failed status')
{
  const s = createMockSession('t-fail', 'test')
  s._failTask('something went wrong')
  assert(s.status === 'failed', 'status failed after _failTask')
  assert(s.result.includes('went wrong'), 'reason in result')
}

// ── Usage/cost extraction tests (via Session) ──────────────────────────

describe('Session — usage data from result message')
{
  const s = createMockSession('t-usage', 'test')
  s._onMessage({
    type: 'result',
    subtype: 'success',
    total_cost_usd: 0.01234,
    usage: { input_tokens: 150, output_tokens: 300, cache_creation_input_tokens: 10, cache_read_input_tokens: 20 },
  })
  assert(s.usage !== null, 'usage captured')
  assert(s.usage.total_cost_usd === 0.01234, 'total_cost_usd')
  assert(s.usage.input_tokens === 150, 'input_tokens')
  assert(s.usage.output_tokens === 300, 'output_tokens')
  assert(s.usage.cache_creation_input_tokens === 10, 'cache_creation')
  assert(s.usage.cache_read_input_tokens === 20, 'cache_read')
}

describe('Session — usage from assistant message with stop_reason')
{
  const s = createMockSession('t-asst-usage', 'test')
  s._onMessage({
    type: 'assistant',
    message: { content: [{ type: 'text', text: 'done' }] },
    stop_reason: 'end_turn',
    total_cost_usd: 0.005,
    usage: { input_tokens: 80, output_tokens: 120 },
  })
  assert(s.usage?.total_cost_usd === 0.005, 'usage from assistant stop_reason')
  assert(s.usage?.input_tokens === 80, 'input_tokens from assistant')
}

// ═══════════════════════════════════════════════════════════════════════
// Session — permission_mode (bypass / approve)
// ═══════════════════════════════════════════════════════════════════════

describe('Session — permission_mode bypass (explicit) auto-allows can_use_tool')
{
  let lastWritten = null
  const s = new Session({ taskId: 't-pm-default', prompt: 'test', permissionMode: 'bypass' })
  s.transport = { write: async (msg) => { lastWritten = msg }, close: () => {} }
  // Explicit bypass mode: should auto-allow can_use_tool
  s._onMessage({
    type: 'control_request',
    request_id: 'r-def',
    request: { subtype: 'can_use_tool', tool_name: 'Bash', input: { command: 'ls' }, tool_use_id: 'tu-def' },
  })
  assert(lastWritten !== null, 'control_response sent for bypass by default')
  assert(lastWritten.type === 'control_response', 'response is control_response')
  assert(lastWritten.response?.response?.behavior === 'allow', 'behavior is allow')
  assert(s._pendingPermission === null, 'no pending permission after auto-allow')
}

describe('Session — permission_mode bypass auto-allows can_use_tool')
{
  let lastWritten = null
  const s = new Session({ taskId: 't-pm-bypass', prompt: 'test', permissionMode: 'bypass' })
  s.transport = { write: async (msg) => { lastWritten = msg }, close: () => {} }
  s._onMessage({
    type: 'control_request',
    request_id: 'r-bypass',
    request: { subtype: 'can_use_tool', tool_name: 'Bash', input: { command: 'ls' }, tool_use_id: 'tu-bypass' },
  })
  assert(lastWritten !== null, 'control_response sent for bypass')
  assert(lastWritten.type === 'control_response', 'response type is control_response')
  assert(lastWritten.response.response.behavior === 'allow', 'behavior is allow')
  assert(lastWritten.response.response.updatedInput?.command === 'ls', 'original input preserved')
  assert(s._pendingPermission === null, 'no pending permission')
}

describe('Session — permission_mode approve blocks and emits permission_request')
{
  let lastWritten = null
  const s = new Session({ taskId: 't-pm-approve', prompt: 'test', permissionMode: 'approve' })
  s.transport = { write: async (msg) => { lastWritten = msg }, close: () => {} }

  // Subscribe to capture SSE events
  const events = []
  s.subscribe({ write: d => events.push(d) })

  s._onMessage({
    type: 'control_request',
    request_id: 'r-approve',
    request: { subtype: 'can_use_tool', tool_name: 'Read', input: { path: '/tmp/x' }, tool_use_id: 'tu-approve' },
  })

  // Should NOT have auto-responded
  assert(lastWritten === null, 'no control_response sent yet (blocked)')

  // Should have pending permission
  assert(s._pendingPermission !== null, 'pending permission set')
  assert(s._pendingPermission.toolName === 'Read', 'tool name captured')
  assert(s._pendingPermission.requestId === 'r-approve', 'request_id captured')
  assert(s._pendingPermission.toolUseId === 'tu-approve', 'tool_use_id captured')

  // Should have emitted permission_request SSE event
  assert(events.some(e => e.includes('permission_request')), 'permission_request SSE event emitted')
  assert(events.some(e => e.includes('Read')), 'tool name in SSE event')

  // Now respond
  const ok = s.respondPermission('allow')
  assert(ok === true, 'respondPermission returns true')
  assert(lastWritten !== null, 'control_response sent after respondPermission')
  assert(lastWritten.response.response.behavior === 'allow', 'behavior is allow')
  assert(s._pendingPermission === null, 'pending permission cleared')
}

describe('Session — permission_mode approve: respondPermission deny')
{
  let lastWritten = null
  const s = new Session({ taskId: 't-pm-deny', prompt: 'test', permissionMode: 'approve' })
  s.transport = { write: async (msg) => { lastWritten = msg }, close: () => {} }

  s._onMessage({
    type: 'control_request',
    request_id: 'r-deny',
    request: { subtype: 'can_use_tool', tool_name: 'Bash', input: { command: 'rm -rf /' }, tool_use_id: 'tu-deny' },
  })

  assert(lastWritten === null, 'blocked before respondPermission')
  const ok = s.respondPermission('deny', undefined, 'Not allowed')
  assert(ok === true, 'respondPermission deny returns true')
  assert(lastWritten.response.response.behavior === 'deny', 'behavior is deny')
  assert(lastWritten.response.response.message === 'Not allowed', 'deny message preserved')
}

// ═══════════════════════════════════════════════════════════════════════
// Bridge pool tests (getTask/getTaskOutput)
// ═══════════════════════════════════════════════════════════════════════

describe('Bridge — getTask')
{
  const b = new Bridge()
  b._completedTasks.set('t-get', { id: 't-get', status: 'done', usage: null, completedAt: Date.now() })
  const t = b.getTask('t-get')
  assert(t?.status === 'done', 'getTask returns completed task')
  assert(t?.id === 't-get', 'getTask returns correct id')
  assert(b.getTask('nonexistent') === null, 'getTask returns null for missing')
}

describe('Bridge — getTaskOutput pending vs done')
{
  const b = new Bridge()
  b._completedTasks.set('t-out', { id: 't-out', status: 'done', result: 'done', exitCode: 0, usage: null, completedAt: Date.now() })
  const done = b.getTaskOutput('t-out')
  assert(done.retrieval_status === 'success', 'done task is success')

  // Pending from active session
  const { Session: Sess } = await import('../../session.mjs')
  const s = new Sess({ taskId: 't-out-pending', prompt: 'test' })
  s.status = 'running'
  b._sessions.set('t-out-pending', s)
  const pending = b.getTaskOutput('t-out-pending')
  assert(pending.retrieval_status === 'pending', 'running task is pending')
}

describe('Bridge — getTaskOutput includes usage from completed')
{
  const b = new Bridge()
  b._completedTasks.set('t-usage-comp', {
    id: 't-usage-comp', status: 'done', result: 'ok', exitCode: 0,
    usage: { total_cost_usd: 0.01, input_tokens: 100, output_tokens: 200, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
    completedAt: Date.now(),
  })
  const stored = b.getTaskOutput('t-usage-comp')
  assert(stored?.task?.usage?.total_cost_usd === 0.01, 'usage from completed task')
}

describe('Bridge — getTaskOutput usage null when no data')
{
  const b = new Bridge()
  b._completedTasks.set('t-no-u', { id: 't-no-u', status: 'done', result: '', exitCode: 0, usage: null, completedAt: Date.now() })
  const stored = b.getTaskOutput('t-no-u')
  assert(stored?.task?.usage === null, 'usage is null when no data')
}

describe('Bridge — getTask includes usage')
{
  const b = new Bridge()
  b._completedTasks.set('t-get-u', { id: 't-get-u', status: 'done', usage: { total_cost_usd: 0.001, input_tokens: 10, output_tokens: 20 }, completedAt: Date.now() })
  const t = b.getTask('t-get-u')
  assert(t?.usage?.total_cost_usd === 0.001, 'getTask returns usage')
}

// ═══════════════════════════════════════════════════════════════════════
// StdioTransport NDJSON safe stringify (should keep working)
// ═══════════════════════════════════════════════════════════════════════

// ===================================================================
// Summary
// ===================================================================

const total = passed + failed
const ok = failed === 0
console.log(`\n${'='.repeat(50)}`)
console.log(`  ${ok ? '✓ ALL' : '✖' } ${total} tests: ${passed} passed, ${failed} failed`)
console.log(`${'='.repeat(50)}\n`)
process.exit(ok ? 0 : 1)
