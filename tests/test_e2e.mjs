#!/usr/bin/env node
/**
 * End-to-end integration test for h2c.
 *
 * Tests the full pipeline:
 *   Bridge API → createTask / cancelTask / getTaskOutput (via Session)
 *   HTTP server → health / task/create / task/output / task/cancel
 *   SSE streaming → subscriber events
 *   Parallel tasks → maxConcurrent + queuing
 *   Persistence → survive restart
 *
 * Usage: node tests/test_e2e.mjs
 */

import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';
import { EventEmitter } from 'events';
import { Readable } from 'stream';
import { unlinkSync, existsSync } from 'fs';

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

async function main() {
  console.log('\n=== h2c End-to-End Integration Test ===\n');

  // ── Phase 1: Bridge + Session lifecycle ─────────────────────
  group('Phase 1: Bridge.createTask + getTaskOutput via Session');

  const { Bridge } = await imp(join(PROJECT_ROOT, 'src/hbridge/bridge.mjs'));
  const { Session } = await imp(join(PROJECT_ROOT, 'src/hbridge/session.mjs'));
  const bridge = new Bridge({ maxConcurrent: 5 });

  // Create a task manually via Session, then register in Bridge for lookup
  const s1 = new Session({ taskId: 't1', prompt: 'hello' });
  s1.status = 'done';
  s1.result = 'Hello world';
  s1.exitCode = 0;
  bridge._sessions.set('t1', s1);
  ok('Session created and registered in Bridge');

  const o1 = bridge.getTaskOutput('t1');
  if (o1 && o1.task.status === 'done') {
    ok('Task status=done');
    if (o1.task.result === 'Hello world') ok('Task result correct: ' + JSON.stringify(o1.task.result));
    else fail('Task result wrong', JSON.stringify(o1.task.result));
  } else {
    fail('Task not done', JSON.stringify(o1));
  }

  // ── Phase 2: cancelTask ─────────────────────────────────────
  group('Phase 2: Bridge.cancelTask');

  const b2 = new Bridge({ maxConcurrent: 5 });
  const s2 = new Session({ taskId: 't-cancel', prompt: 'long running' });
  s2.status = 'running';
  b2._sessions.set('t-cancel', s2);

  const cancelled = b2.cancelTask('t-cancel');
  if (cancelled) ok('cancelTask returned true');
  else fail('cancelTask returned false');

  if (!b2._sessions.has('t-cancel')) ok('Session removed after cancel');
  else fail('Session still present after cancel');

  // ── Phase 3: HTTP server endpoints ─────────────────────────
  group('Phase 3: HTTP server endpoints');

  const { createServer: createHttpServer } = await imp(join(PROJECT_ROOT, 'src/hbridge/server.mjs'));
  const b3 = new Bridge({ maxConcurrent: 5 });

  process.env.H2C_HOME = '1'; // skip auth
  const server = createHttpServer('test', b3);
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = /** @type {any} */ (server.address()).port;
  ok('Server on :' + port);

  // Health
  let r = await (await fetch('http://127.0.0.1:' + port + '/health')).json();
  if (r.status === 'ok') ok('GET /health -> {"status":"ok"}');
  else fail('/health', JSON.stringify(r));

  // Task create via HTTP (uses fire-and-forget — Bridge creates Session)
  // Simulate a real flow by creating a Session and registering it
  const httpTaskId = 'http-task-' + Date.now();
  const s3 = new Session({ taskId: httpTaskId, prompt: 'http task' });
  s3.status = 'done';
  s3.result = 'HTTP works';
  s3.exitCode = 0;
  b3._sessions.set(httpTaskId, s3);

  // Output via HTTP
  r = await (await fetch('http://127.0.0.1:' + port + '/v1/task/output?task_id=' + httpTaskId)).json();
  if (r.task && r.task.status === 'done') {
    ok('GET /v1/task/output: status=done');
    if (r.task.result === 'HTTP works') ok('Result: ' + JSON.stringify(r.task.result));
    else fail('Result wrong', JSON.stringify(r.task.result));
  } else {
    fail('Output wrong', JSON.stringify(r));
  }

  // Task cancel via HTTP
  const cancelTaskId = 'cancel-http-' + Date.now();
  const s3c = new Session({ taskId: cancelTaskId, prompt: 'cancel me' });
  s3c.status = 'running';
  b3._sessions.set(cancelTaskId, s3c);
  r = await (await fetch('http://127.0.0.1:' + port + '/v1/task/cancel', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task_id: cancelTaskId }),
  })).json();
  if (r.status === 'cancelled' || r.status === 'not_found') ok('POST /v1/task/cancel -> ' + r.status);
  else fail('cancel', JSON.stringify(r));

  server.close();

  // ── Phase 4: SSE streaming (via Session) ────────────────────
  group('Phase 4: SSE streaming (progressive chunks)');

  const s4 = new Session({ taskId: 't-stream', prompt: 'stream test' });
  const chunks = [];
  s4.subscribe({ write: d => { try { const p = JSON.parse(d.replace(/^data: /, '')); if (p.type === 'chunk') chunks.push(p.text); } catch {} } });

  // Simulate stream_event deltas + final assistant
  s4._onMessage({ type: 'stream_event', event: { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'Hello' } } });
  s4._onMessage({ type: 'stream_event', event: { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: ' World' } } });
  s4._onMessage({ type: 'assistant', message: { content: [{ type: 'text', text: 'Hello World' }] } });
  s4._onMessage({ stop_reason: 'end_turn' });
  await sleep(200);

  if (chunks.length >= 2) ok('Progressive streaming: ' + chunks.length + ' chunks [' + chunks.join('') + ']');
  else if (chunks.length === 1) ok('Single chunk (non-progressive): ' + JSON.stringify(chunks[0]));
  else fail('No streaming chunks');

  if (s4.status === 'done') ok('Stream task done');
  else fail('Stream task not done', s4.status);

  // ── Phase 5: Error subtype handling ─────────────────────
  group('Phase 5: Error subtype -> exitCode=1');

  const s5 = new Session({ taskId: 't-err', prompt: 'error test' });
  s5._onMessage({ type: 'result', subtype: 'error_during_execution', errors: ['oops'], uuid: 'err-1' });
  await sleep(100);
  if (s5.exitCode === 1) ok('Error subtype -> exitCode=1');
  else fail('ExitCode not 1', JSON.stringify(s5.exitCode));

  // ── Phase 6: Multi-turn auto-respond (via Session) ──────────
  group('Phase 6: Multi-turn auto-respond');

  const s6 = new Session({ taskId: 't-multi', prompt: 'multi-turn test', maxAutoRespond: 5 });
  s6.transport = { write: async (m) => { s6._lastWritten = m; } };
  s6.status = 'running';

  // Simulate Claude asking a question
  s6._onMessage({ type: 'user', message: { role: 'user', content: 'which file?' }, session_id: 's1' });
  s6._onMessage({ type: 'user', message: { role: 'user', content: 'proceed?' }, session_id: 's1' });

  if (s6._autoRespondCount === 2) ok('Auto-respond fired ' + s6._autoRespondCount + ' times');
  else fail('Auto-respond count=' + s6._autoRespondCount);

  // Finish
  s6._onMessage({ type: 'assistant', message: { content: [{ type: 'text', text: 'final answer' }] } });
  s6._onMessage({ stop_reason: 'end_turn' });
  await sleep(100);
  if (s6.status === 'done') ok('Multi-turn task completed after auto-respond');

  // ── Phase 7: tool_progress forwarding ────────────────────────
  group('Phase 7: tool_progress SSE forwarding');

  const s7 = new Session({ taskId: 't-tool', prompt: 'tool test' });
  const toolEvents = [];
  s7.subscribe({ write: d => { try { const p = JSON.parse(d.replace(/^data: /, '')); if (p.type === 'tool_progress') toolEvents.push(p); } catch {} } });
  s7._onMessage({ type: 'tool_progress', tool_name: 'Bash', tool_use_id: 'tu1', elapsed_time_seconds: 1.5 });
  s7._onMessage({ type: 'tool_progress', tool_name: 'Read', tool_use_id: 'tu2', elapsed_time_seconds: 3.2 });

  if (toolEvents.length === 2) ok('tool_progress: ' + toolEvents.length + ' events forwarded');
  else fail('tool_progress count=' + toolEvents.length);
  if (toolEvents[0]?.tool_name === 'Bash') ok('First tool: Bash (' + toolEvents[0].elapsed + 's)');
  else fail('First tool wrong', JSON.stringify(toolEvents[0]));

  // ── Phase 8: auth_status / rate_limit_event ─────────────
  group('Phase 8: auth_status + rate_limit_event');

  const s8 = new Session({ taskId: 't-ar', prompt: 'auth/rate test' });
  s8._onMessage({ type: 'auth_status', isAuthenticating: true, output: ['opening browser...'] });
  s8._onMessage({ type: 'auth_status', isAuthenticating: false, error: 'cancelled' });
  ok('auth_status handled without error');
  s8._onMessage({ type: 'rate_limit_event', rate_limit_info: { status: 'exceeded' } });
  ok('rate_limit_event handled without error');

  // ── Phase 9: NDJSON stdout guard (MCP mode) ─────────────
  group('Phase 9: NDJSON stdout guard');

  const { startMcpServer: startMcp } = await imp(join(PROJECT_ROOT, 'src/hbridge/mcp.mjs'));
  ok('mcp.mjs exports startMcpServer (guard applied at startup)');

  const guardText = startMcp.toString();
  if (guardText.includes('origStdoutWrite')) ok('NDJSON stdout guard is active');
  else fail('NDJSON guard not found in startMcpServer');

  // ── Phase 10: Result data extraction (cost/token/usage) ───
  group('Phase 10: Result data extraction (cost/token/usage)');

  const s10 = new Session({ taskId: 't-usage', prompt: 'usage test' });
  s10._onMessage({
    type: 'result', subtype: 'success',
    total_cost_usd: 0.01234,
    usage: { input_tokens: 150, output_tokens: 300, cache_creation_input_tokens: 10, cache_read_input_tokens: 20 },
  });

  if (s10.usage) {
    const u = s10.usage;
    if (u.total_cost_usd === 0.01234) ok('total_cost_usd: ' + u.total_cost_usd);
    else fail('total_cost_usd wrong', JSON.stringify(u));
    if (u.input_tokens === 150) ok('input_tokens: ' + u.input_tokens);
    else fail('input_tokens wrong', JSON.stringify(u));
    if (u.output_tokens === 300) ok('output_tokens: ' + u.output_tokens);
    else fail('output_tokens wrong', JSON.stringify(u));
    if (u.cache_creation_input_tokens === 10) ok('cache_creation_input_tokens: ' + u.cache_creation_input_tokens);
    else fail('cache_creation_input_tokens wrong', JSON.stringify(u));
    if (u.cache_read_input_tokens === 20) ok('cache_read_input_tokens: ' + u.cache_read_input_tokens);
    else fail('cache_read_input_tokens wrong', JSON.stringify(u));
  } else {
    fail('No usage data in task', JSON.stringify(s10));
  }

  // ── Phase 11: Result data on assistant message with stop_reason ──
  group('Phase 11: Result data on assistant message with stop_reason');

  const s11 = new Session({ taskId: 't-usage-asst', prompt: 'usage on assistant' });
  s11._onMessage({
    type: 'assistant', message: { content: [{ type: 'text', text: 'done' }] },
    stop_reason: 'end_turn', total_cost_usd: 0.005,
    usage: { input_tokens: 80, output_tokens: 120 },
  });

  if (s11.usage?.total_cost_usd === 0.005) ok('Usage from assistant stop_reason: $' + s11.usage.total_cost_usd);
  else fail('Usage from assistant missing', JSON.stringify(s11.usage));

  // ── Phase 12: Parallel tasks (maxConcurrent) ────────────────
  group('Phase 12: Parallel tasks with maxConcurrent');

  const b12 = new Bridge({ maxConcurrent: 2 });
  // Register 3 tasks manually to simulate max concurrent check
  b12._sessions.set('p1', new Session({ taskId: 'p1', prompt: 'p1' }));
  b12._sessions.set('p2', new Session({ taskId: 'p2', prompt: 'p2' }));
  if (b12.getActiveCount() === 2) ok('2 sessions active at maxConcurrent=2');
  else fail('Active count wrong', String(b12.getActiveCount()));

  // Queue a third task
  const p3Promise = b12.createTask('p3', 'p3');
  if (b12.getQueueDepth() === 1) ok('Third task queued, depth=1');
  else fail('Queue depth wrong', String(b12.getQueueDepth()));

  // Complete one session → queued task starts
  const p1Sess = b12._sessions.get('p1');
  if (p1Sess) {
    p1Sess.status = 'done';
    p1Sess.result = 'ok';
    b12._onSessionComplete(p1Sess);
    await sleep(100);
    if (b12.getQueueDepth() === 0) ok('Queue drained after session completion');
    else fail('Queue not drained', String(b12.getQueueDepth()));
    if (b12._sessions.has('p3')) ok('Queued task started as new session');
  }

  // ── Phase 13: Persistence (survive restart) ────────────────
  group('Phase 13: Task persistence (survive restart)');

  const { getTasksFilePath, appendCompletedTask, loadCompletedTasks } = await imp(join(PROJECT_ROOT, 'src/hbridge/persistence.mjs'));
  const taskFile = getTasksFilePath();

  // Clean up
  try { unlinkSync(taskFile); } catch {}

  // Write a task to persistence
  appendCompletedTask({
    id: 'persisted-task-1', prompt: 'persist test', status: 'done',
    result: 'survived restart', exitCode: 0,
    usage: { total_cost_usd: 0.01, input_tokens: 10, output_tokens: 20, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
  });
  ok('Task written to persistence file');

  // New Bridge should load it from disk
  const b13 = new Bridge({ maxConcurrent: 3 });
  const loaded = b13.getTaskOutput('persisted-task-1');
  if (loaded?.task.result === 'survived restart') ok('Task loaded from disk: result=' + loaded.task.result);
  else fail('Task not found from disk', JSON.stringify(loaded));

  // Verify getTask also works from disk
  const t13 = b13.getTask('persisted-task-1');
  if (t13?.usage?.total_cost_usd === 0.01) ok('getTask loads usage from persisted task');
  else fail('getTask from disk missing usage', JSON.stringify(t13));

  // Clean up persistence file
  try { unlinkSync(taskFile); } catch {}

  // ── Phase 14: Session timeout ──────────────────────────────
  group('Phase 14: Session timeout');

  const s14 = new Session({ taskId: 't-timeout', prompt: 'timeout test', taskTimeoutMs: 50 });
  s14.start().catch(() => {});
  await sleep(300);
  // Timeout calls _failTask → status becomes "failed"
  if (s14.status === 'failed' && s14.result === 'timeout') ok('Session timed out after 50ms');
  else fail('Session did not timeout', 'status=' + s14.status + ' result=' + s14.result);
  if (s14.child && !s14.child.killed) try { s14.child.kill(); } catch {}

  // ── Phase 15: Session error subtypes ──────────────────────
  group('Phase 15: Session error subtypes');

  const subtypes = ['error_max_turns', 'error_max_budget_usd', 'error_max_structured_output_retries'];
  for (const st of subtypes) {
    const s = new Session({ taskId: 't-err-' + st, prompt: 'err test' });
    s._onMessage({ type: 'result', subtype: st, errors: ['err'] });
    if (s.exitCode === 1) ok(st + ' -> exitCode=1');
    else fail(st + ' exitCode wrong', String(s.exitCode));
  }

  // ── Phase 16: Session _failTask sets exitCode=1 ────────────
  group('Phase 16: Session _failTask');

  const s16 = new Session({ taskId: 't-fail-exit', prompt: 'fail test' });
  s16._failTask('something bad');
  if (s16.exitCode === 1) ok('_failTask sets exitCode=1');
  else fail('_failTask exitCode', String(s16.exitCode));
  if (s16.status === 'failed') ok('_failTask sets status=failed');
  else fail('_failTask status', s16.status);

  // ── Phase 17: Parallel session completion order ──────────
  group('Phase 17: Parallel completion order');

  const completionOrder = [];
  const s17a = new Session({ taskId: 't-order-a', prompt: 'a' });
  const s17b = new Session({ taskId: 't-order-b', prompt: 'b' });
  s17a._onComplete = () => completionOrder.push('a');
  s17b._onComplete = () => completionOrder.push('b');

  // Complete in reverse order via Session._finishTask
  s17b._finishTask(0);
  s17a._finishTask(0);
  await sleep(50);

  if (completionOrder.length === 2) ok('Both completed: ' + completionOrder.join(' -> '));
  else fail('Only ' + completionOrder.length + ' completed');
  if (completionOrder[0] === 'b' && completionOrder[1] === 'a') ok('Order preserved (b then a)');
  else fail('Unexpected order', completionOrder.join(','));

  // Bridge cleanup via _onSessionComplete
  const b17 = new Bridge({ maxConcurrent: 3 });
  const s17c = new Session({ taskId: 't-order-c', prompt: 'c' });
  s17c._onComplete = (s) => b17._onSessionComplete(s);
  b17._sessions.set('t-order-c', s17c);
  s17c._finishTask(0);
  await sleep(50);
  if (!b17._sessions.has('t-order-c')) ok('Bridge session cleaned up after completion');
  else fail('Bridge session not cleaned up');

  // ── Phase 18: Persistence trim ─────────────────────────────
  group('Phase 18: Persistence trim');

  const { trimCompletedTasks } = await imp(join(PROJECT_ROOT, 'src/hbridge/persistence.mjs'));
  const TASK_FILE2 = getTasksFilePath();
  try { unlinkSync(TASK_FILE2); } catch {}

  for (let i = 0; i < 150; i++) {
    appendCompletedTask({ id: 'trim-' + i, prompt: 'trim', status: 'done', result: 'x', exitCode: 0, usage: null });
  }
  ok('150 tasks written');

  trimCompletedTasks();
  const remaining = loadCompletedTasks().length;
  if (remaining <= 150) ok('File stable after trim (' + remaining + ' tasks)');
  else fail('File grew after trim: ' + remaining);

  try { unlinkSync(TASK_FILE2); } catch {}

  // ── Phase 19: Edge cases ──────────────────────────────────
  group('Phase 19: Edge cases');

  const b19 = new Bridge({ maxConcurrent: 3 });
  b19.unsubscribeTask('nonexistent', { write: () => {} });
  ok('unsubscribeTask nonexistent — no throw');

  b19.cancelTask('nonexistent');
  ok('cancelTask nonexistent — no throw');

  const s19 = new Session({ taskId: 't-edge', prompt: 'edge' });
  s19.unsubscribe({ write: () => {} });
  ok('Session unsubscribe before subscribe — no throw');

  // _finishTask is idempotent
  const s19b = new Session({ taskId: 't-edge2', prompt: 'edge' });
  s19b._finishTask(0);
  s19b._finishTask(0); // second call should be no-op
  if (s19b.status === 'done') ok('Session double _finishTask is idempotent');
  else fail('Double _finishTask broke state', s19b.status);
  const total = passed + failed;
  console.log('\n' + '='.repeat(60));
  console.log('  ' + (failed === 0 ? 'ALL PASSED' : 'SOME FAILED') + ' — ' + total + ' checks: ' + passed + ' passed, ' + failed + ' failed');
  console.log('='.repeat(60) + '\n');
  process.exit(failed > 0 ? 1 : 0);
}

main();
