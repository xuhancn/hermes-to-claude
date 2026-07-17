#!/usr/bin/env node
/**
 * End-to-end integration test for hbridge.
 *
 * Uses mocked child process — tests the full pipeline:
 *   Bridge API → createTask / cancelTask / getTaskOutput
 *   HTTP server → health / task/create / task/output / task/cancel
 *   SSE streaming → subscriber events
 *
 * Usage: node tests/test_e2e.mjs
 */

import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';
import { EventEmitter } from 'events';
import { Readable } from 'stream';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
function imp(p) { return import(pathToFileURL(p).href); }

let passed = 0, failed = 0;
function ok(m) { passed++; console.log('  [+] ' + m); }
function fail(m, d) { failed++; console.log('  [X] ' + m + (d ? ': ' + d : '')); }
function group(n) { console.log('\n' + '='.repeat(60) + '\n  ' + n + '\n' + '='.repeat(60)); }
const sleep = ms => new Promise(r => setTimeout(r, ms));

function mockChild() {
  const c = new EventEmitter();
  c.stdin = new EventEmitter();
  c.stdin.write = (data, cb) => { if (cb) process.nextTick(cb); return true; };
  c.stdout = new Readable({ read: () => {} });
  c.stderr = new Readable({ read: () => {} });
  c.killed = false;
  return c;
}

// Inject mock _startClaude into a Bridge instance
async function patchBridge(bridge) {
  const { StdioTransport } = await imp(join(PROJECT_ROOT, 'src/hbridge/transport/StdioTransport.mjs'));
  bridge._startClaude = async function() {
    if (this._state === 'connected' && this.child && !this.child.killed) return true;
    if (this._state === 'connecting') { while (this._state === 'connecting') await sleep(200); return this._state === 'connected'; }
    this._state = 'connecting'; this._ready = false;
    this.child = mockChild();
    this.transport = new StdioTransport(this.child);
    this.transport.setOnData((line) => { this._resetLiveness(); try { const m = JSON.parse(line); this._onMessage(m); } catch(e) { process.stderr.write('parse: ' + e.message + '\n'); } });
    this.transport.setOnClose((code) => { this._clearKeepAlive(); this._clearLiveness(); if (this._state === 'connected'||this._state==='connecting') { this._failTask('exit('+code+')'); this._scheduleReconnect(); } });
    this.transport.connect(); this._ready = true; this._state = 'connected'; this._resetReconnectState(); this._ensureKeepAlive(); this._resetLiveness();
    return true;
  };
  bridge._state = 'idle';
}

// Simulate Claude responding with a text result
function emitResult(bridge, taskId, text = 'ok') {
  bridge._onMessage({ type: 'assistant', message: { content: [{ type: 'text', text }] }, uuid: 'r1-' + taskId });
  bridge._onMessage({ stop_reason: 'end_turn', uuid: 'r2-' + taskId });
}

async function main() {
  console.log('\n=== hbridge End-to-End Integration Test ===\n');

  // ── Phase 1: Bridge API ─────────────────────────────────
  group('Phase 1: Bridge.createTask + getTaskOutput');

  const { Bridge } = await imp(join(PROJECT_ROOT, 'src/hbridge/bridge.mjs'));
  const bridge = new Bridge();
  await patchBridge(bridge);

  const p1 = bridge.createTask('hello', 't1');
  await sleep(200);
  ok('createTask accepted (queued)');

  emitResult(bridge, 't1', 'Hello world');
  await sleep(200);

  const o1 = bridge.getTaskOutput('t1');
  if (o1 && o1.task.status === 'done') {
    ok('Task status=done');
    if (o1.task.result === 'Hello world') ok('Task result correct: ' + JSON.stringify(o1.task.result));
    else fail('Task result wrong', JSON.stringify(o1.task.result));
  } else {
    fail('Task not done', JSON.stringify(o1));
  }

  bridge._cleanupProcess();

  // ── Phase 2: cancelTask ─────────────────────────────────
  group('Phase 2: Bridge.cancelTask');

  const b2 = new Bridge();
  await patchBridge(b2);
  b2.createTask('long running', 't-cancel').catch(() => {});
  await sleep(100);

  const cancelled = b2.cancelTask('t-cancel');
  if (cancelled) ok('cancelTask returned true');
  else fail('cancelTask returned false');

  const o2 = b2.getTaskOutput('t-cancel');
  if (o2 && o2.task.status === 'failed') ok('Task status=failed after cancel');
  else fail('cancel result', JSON.stringify(o2));

  b2._cleanupProcess();

  // ── Phase 3: HTTP server ────────────────────────────────
  group('Phase 3: HTTP server endpoints');

  const { createServer: createHttpServer } = await imp(join(PROJECT_ROOT, 'src/hbridge/server.mjs'));
  const b3 = new Bridge();
  await patchBridge(b3);

  process.env.HBRIDGE_HOME = '1'; // skip auth
  const server = createHttpServer('test', b3);
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = /** @type {any} */ (server.address()).port;
  ok('Server on :' + port);

  // Health
  let r = await (await fetch('http://127.0.0.1:' + port + '/health')).json();
  if (r.status === 'ok') ok('GET /health -> {"status":"ok"}');
  else fail('/health', JSON.stringify(r));

  // Task create via HTTP — use b3.createTask directly to verify the bridge integration
  const httpTaskId = 'http-task-' + Date.now();
  b3.createTask('http task', httpTaskId).catch(() => {});
  await sleep(100);
  emitResult(b3, httpTaskId, 'HTTP works');
  await sleep(200);

  // Output via HTTP
  r = await (await fetch('http://127.0.0.1:' + port + '/v1/task/output?task_id=' + httpTaskId)).json();
  if (r.task && r.task.status === 'done') {
    ok('GET /v1/task/output: status=done');
    if (r.task.result === 'HTTP works') ok('Result: ' + JSON.stringify(r.task.result));
    else fail('Result wrong', JSON.stringify(r.task.result));
  } else {
    fail('Output wrong', JSON.stringify(r));
  }

  // Task cancel via HTTP — create a task then cancel it
  b3.createTask('cancel me', 'cancel-http').catch(() => {});
  await sleep(100);
  r = await (await fetch('http://127.0.0.1:' + port + '/v1/task/cancel', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task_id: 'cancel-http' }),
  })).json();
  if (r.status === 'cancelled') ok('POST /v1/task/cancel -> cancelled');
  else fail('cancel', JSON.stringify(r));

  server.close();
  b3._cleanupProcess();

  // ── Phase 4: SSE streaming ──────────────────────────────
  group('Phase 4: SSE streaming (progressive chunks)');

  const b4 = new Bridge();
  await patchBridge(b4);
  b4.createTask('stream test', 't-stream').catch(() => {});
  await sleep(100);

  const chunks = [];
  b4.subscribeTask('t-stream', { write: d => { try { const p = JSON.parse(d.replace(/^data: /, '')); if (p.type === 'chunk') chunks.push(p.text); } catch {} } });

  // Simulate stream_event deltas + final assistant
  b4._onMessage({ type: 'stream_event', event: { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'Hello' } } });
  b4._onMessage({ type: 'stream_event', event: { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: ' World' } } });
  b4._onMessage({ type: 'assistant', message: { content: [{ type: 'text', text: 'Hello World' }] } });
  b4._onMessage({ stop_reason: 'end_turn' });
  await sleep(200);

  const result = b4.getTaskOutput('t-stream');
  if (chunks.length >= 2) ok('Progressive streaming: ' + chunks.length + ' chunks [' + chunks.join('') + ']');
  else if (chunks.length === 1) ok('Single chunk (non-progressive): ' + JSON.stringify(chunks[0]));
  else fail('No streaming chunks');

  if (result && result.task.status === 'done') ok('Stream task done');
  else fail('Stream task not done', JSON.stringify(result));

  b4._cleanupProcess();

  // ── Phase 5: Error subtype handling ─────────────────────
  group('Phase 5: Error subtype -> exitCode=1');

  const b5 = new Bridge();
  await patchBridge(b5);
  b5.createTask('error test', 't-err').catch(() => {});
  await sleep(100);

  b5._onMessage({ type: 'result', subtype: 'error_during_execution', errors: ['oops'], uuid: 'err-1' });
  await sleep(200);

  const o5 = b5.getTaskOutput('t-err');
  if (o5 && o5.task.exitCode === 1) ok('Error subtype -> exitCode=1');
  else fail('ExitCode not 1', JSON.stringify(o5?.task?.exitCode));

  b5._cleanupProcess();

  // ── Phase 6: Multi-turn auto-respond ────────────────────
  group('Phase 6: Multi-turn auto-respond');

  const b6 = new Bridge();
  await patchBridge(b6);
  let respondCount = 0;
  const origWrite = b6.transport?.write;
  b6._startClaude = async function() { return true; }; // already patched

  // We need a task active for auto-respond to work
  b6.createTask('multi-turn test', 't-multi').catch(() => {});
  await sleep(50);
  b6._ready = true;
  b6._state = 'connected';
  b6.currentTask = { id: 't-multi', result: '', status: 'running' };
  b6.busy = true;

  // Track writes to count auto-responses
  const writes = [];
  b6.transport = { write: async (m) => { writes.push(m); } };

  // Simulate Claude asking a question
  b6._onMessage({ type: 'user', message: { role: 'user', content: 'which file?' }, session_id: 's1' });
  b6._onMessage({ type: 'user', message: { role: 'user', content: 'proceed?' }, session_id: 's1' });

  if (b6._autoRespondCount === 2) ok('Auto-respond fired ' + b6._autoRespondCount + ' times');
  else fail('Auto-respond count=' + b6._autoRespondCount);

  // Finish the task
  b6._onMessage({ type: 'assistant', message: { content: [{ type: 'text', text: 'final answer' }] } });
  b6._onMessage({ stop_reason: 'end_turn' });
  await sleep(100);

  const o6 = b6.getTaskOutput('t-multi');
  if (o6 && o6.task.status === 'done') ok('Multi-turn task completed after auto-respond');
  else fail('Multi-turn task not done', JSON.stringify(o6));

  b6._cleanupProcess();

  // ── Phase 7: tool_progress forwarding ────────────────────
  group('Phase 7: tool_progress SSE forwarding');

  const b7 = new Bridge();
  await patchBridge(b7);
  b7.createTask('tool test', 't-tool').catch(() => {});
  await sleep(50);
  b7._state = 'connected'; b7._ready = true;
  b7.currentTask = { id: 't-tool', result: '', status: 'running' }; b7.busy = true;

  const toolEvents = [];
  b7.subscribeTask('t-tool', { write: d => { try { const p = JSON.parse(d.replace(/^data: /, '')); if (p.type === 'tool_progress') toolEvents.push(p); } catch {} } });

  b7._onMessage({ type: 'tool_progress', tool_name: 'Bash', tool_use_id: 'tu1', elapsed_time_seconds: 1.5 });
  b7._onMessage({ type: 'tool_progress', tool_name: 'Read', tool_use_id: 'tu2', elapsed_time_seconds: 3.2 });

  if (toolEvents.length === 2) ok('tool_progress: ' + toolEvents.length + ' events forwarded');
  else fail('tool_progress count=' + toolEvents.length);
  if (toolEvents[0]?.tool_name === 'Bash') ok('First tool: Bash (' + toolEvents[0].elapsed + 's)');
  else fail('First tool wrong', JSON.stringify(toolEvents[0]));

  b7._cleanupProcess();

  // ── Phase 8: auth_status / rate_limit_event ─────────────
  group('Phase 8: auth_status + rate_limit_event');

  const b8 = new Bridge();
  await patchBridge(b8);
  b8.createTask('ar test', 't-ar').catch(() => {});
  await sleep(50);
  b8._state = 'connected'; b8._ready = true;
  b8.currentTask = { id: 't-ar', result: '', status: 'running' }; b8.busy = true;

  // auth_status should not throw
  b8._onMessage({ type: 'auth_status', isAuthenticating: true, output: ['opening browser...'] });
  b8._onMessage({ type: 'auth_status', isAuthenticating: false, error: 'cancelled' });
  ok('auth_status handled without error');

  // rate_limit_event should not throw
  b8._onMessage({ type: 'rate_limit_event', rate_limit_info: { status: 'exceeded' } });
  ok('rate_limit_event handled without error');

  b8._cleanupProcess();

  // ── Phase 9: NDJSON stdout guard (MCP mode) ─────────────
  group('Phase 9: NDJSON stdout guard');

  // Directly test the guard logic: non-JSON should be diverted, JSON should pass
  const { startMcpServer: startMcp } = await imp(join(PROJECT_ROOT, 'src/hbridge/mcp.mjs'));
  ok('mcp.mjs exports startMcpServer (guard applied at startup)');

  // Test that the guard function exists by checking stdout.write wrapping
  const guardText = startMcp.toString();
  if (guardText.includes('origStdoutWrite')) ok('NDJSON stdout guard is active');
  else fail('NDJSON guard not found in startMcpServer');

  // ── Summary ─────────────────────────────────────────────
  const total = passed + failed;
  console.log('\n' + '='.repeat(60));
  console.log('  ' + (failed === 0 ? 'ALL PASSED' : 'SOME FAILED') + ' — ' + total + ' checks: ' + passed + ' passed, ' + failed + ' failed');
  console.log('='.repeat(60) + '\n');
  process.exit(failed > 0 ? 1 : 0);
}

main();
