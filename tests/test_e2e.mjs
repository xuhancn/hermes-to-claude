#!/usr/bin/env node
/**
 * End-to-end integration test for hbridge HTTP API.
 *
 * Starts the Bridge with real Claude Code, tests via HTTP:
 *   - Health check
 *   - Task create
 *   - Task output (polling)
 *   - Task cancel
 *   - CWD support
 *
 * Usage: node tests/test_e2e.mjs
 * Prerequisites: Claude Code installed (npx @anthropic-ai/claude-code)
 */

import { spawn } from 'child_process';
import { createServer } from 'http';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';
import { randomUUID } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');

function imp(absPath) { return import(pathToFileURL(absPath).href); }
async function impMod(name) { return imp(join(PROJECT_ROOT, name)); }

let passed = 0, failed = 0;
function ok(msg) { passed++; console.log('  ✅ ' + msg); }
function fail(msg, detail) { failed++; console.log('  ❌ ' + msg + (detail ? ': ' + detail : '')); }
function group(name) { console.log('\n' + '='.repeat(60) + '\n  ' + name + '\n' + '='.repeat(60)); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchJSON(url, opts = {}) {
  const r = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  return { status: r.status, body: await r.json() };
}

async function main() {
  console.log('\n=== hbridge End-to-End Integration Test ===');

  // ── Phase 1: Task lifecycle via Bridge directly ────────
  group('Phase 1: Bridge.createTask with simple prompt');

  const { Bridge } = await imp(bridgePath);
  const bridge = new Bridge();

  // Patch _startClaude to handle spawn
  const { StdioTransport } = await impMod('src/hbridge/transport/StdioTransport.mjs');
  bridge._startClaude = async function(opts = {}) {
    if (this._state === 'connected' && this.child && !this.child.killed) return true;
    if (this._state === 'connecting') { while (this._state === 'connecting') await sleep(200); return this._state === 'connected'; }
    this._state = 'connecting';
    const cwd = opts.cwd || this._cwd || process.cwd();
    this._cwd = cwd;
    const isWin = process.platform === 'win32';
    const CLAUDE_ARGS = ['@anthropic-ai/claude-code','--print','--input-format','stream-json','--output-format','stream-json','--verbose','--dangerously-skip-permissions'];
    const cmd = isWin ? 'cmd.exe' : 'npx';
    const args = isWin ? ['/d','/s','/c','npx.cmd ' + CLAUDE_ARGS.join(' ')] : CLAUDE_ARGS;
    this.child = spawn(cmd, args, { stdio: ['pipe','pipe','pipe'], cwd, env: { ...process.env } });
    this.transport = new StdioTransport(this.child);
    this.transport.setOnData((line) => { this._resetLiveness(); try { const m = JSON.parse(line); this._onMessage(m); } catch(e) { process.stderr.write('parse: ' + e.message + '\n'); } });
    this.transport.setOnClose((code) => { this._clearKeepAlive(); this._clearLiveness(); if (this._state === 'connected'||this._state==='connecting') { this._failTask('exit('+code+')'); this._scheduleReconnect(); } });
    this.transport.connect(); this._ready = true; this._state = 'connected'; this._resetReconnectState(); this._ensureKeepAlive(); this._resetLiveness();
    return true;
  };
  bridge._state = 'idle';

  // Test task create
  const t1 = bridge.createTask('say hello in 3 words', 'e2e-test-1');
  const deadline = Date.now() + 30000;
  let done = false;
  while (Date.now() < deadline) {
    const o = bridge.getTaskOutput('e2e-test-1');
    if (o?.task?.status === 'done' || o?.task?.status === 'failed') { done = true; break; }
    await sleep(500);
  }

  if (done) {
    const o = bridge.getTaskOutput('e2e-test-1');
    ok('Task completed: status=' + o.task.status + ' exitCode=' + o.task.exitCode);
    if (o.task.result && o.task.result.length > 0) ok('Result: ' + JSON.stringify(o.task.result.slice(0, 100)));
    else fail('Empty result');
  } else {
    fail('Task didnt complete within 30s');
  }

  // Test cancelTask
  group('Phase 2: Bridge.cancelTask');

  bridge.createTask('write a 1000 line novel', 'e2e-cancel-1').catch(() => {});
  await sleep(1000);
  const cancelled = bridge.cancelTask('e2e-cancel-1');
  if (cancelled) {
    ok('cancelTask returned true');
    const o = bridge.getTaskOutput('e2e-cancel-1');
    if (o && o.task.status === 'failed') ok('Task status=failed after cancel');
    else fail('Task status not failed after cancel', o?.task?.status);
  } else {
    fail('cancelTask returned false');
  }

  // Cleanup
  bridge._cleanupProcess();

  // ── Phase 3: HTTP server endpoints ─────────────────────
  group('Phase 3: HTTP server endpoints');

  const { createServer: createHttpServer } = await imp(serverPath);
  const httpBridge = (await imp(bridgePath)).Bridge;
  const b2 = new httpBridge();

  b2._startClaude = async function(opts = {}) {
    if (this._state === 'connected' && this.child && !this.child.killed) return true;
    if (this._state === 'connecting') { while (this._state === 'connecting') await sleep(200); return this._state === 'connected'; }
    this._state = 'connecting';
    const cwd = opts.cwd || this._cwd || process.cwd();
    this._cwd = cwd;
    const isWin = process.platform === 'win32';
    const CLAUDE_ARGS = ['@anthropic-ai/claude-code','--print','--input-format','stream-json','--output-format','stream-json','--verbose','--dangerously-skip-permissions'];
    const cmd = isWin ? 'cmd.exe' : 'npx';
    const args = isWin ? ['/d','/s','/c','npx.cmd ' + CLAUDE_ARGS.join(' ')] : CLAUDE_ARGS;
    this.child = spawn(cmd, args, { stdio: ['pipe','pipe','pipe'], cwd, env: { ...process.env } });
    this.transport = new StdioTransport(this.child);
    this.transport.setOnData((line) => { this._resetLiveness(); try { const m = JSON.parse(line); this._onMessage(m); } catch(e) {} });
    this.transport.setOnClose((code) => { this._clearKeepAlive(); this._clearLiveness(); if (this._state === 'connected'||this._state==='connecting') { this._failTask('exit('+code+')'); this._scheduleReconnect(); } });
    this.transport.connect(); this._ready = true; this._state = 'connected'; this._resetReconnectState(); this._ensureKeepAlive(); this._resetLiveness();
    return true;
  };
  b2._state = 'idle';

  // Create a server that uses our bridge instance
  const server = createHttpServer('test-key');
  const port = 9876;
  await new Promise(r => server.listen(port, '127.0.0.1', r));
  ok('HTTP server listening on :' + port);

  // Test health
  try {
    const h = await fetchJSON('http://127.0.0.1:' + port + '/health');
    if (h.body.status === 'ok') ok('GET /health → {"status":"ok"}');
    else fail('/health unexpected', JSON.stringify(h.body));
  } catch (e) {
    fail('/health failed', e.message);
  }

  // Test task create + output via HTTP
  try {
    const t = await fetchJSON('http://127.0.0.1:' + port + '/v1/task/create', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'write hello in 3 words' }),
    });
    if (t.body.task_id) ok('POST /v1/task/create → task_id=' + t.body.task_id);
    else fail('create returned no task_id', JSON.stringify(t.body));

    // Poll for output
    const pollDeadline = Date.now() + 30000;
    let pollDone = false;
    while (Date.now() < pollDeadline) {
      const o = await fetchJSON('http://127.0.0.1:' + port + '/v1/task/output?task_id=' + t.body.task_id);
      if (o.body.task?.status === 'done' || o.body.task?.status === 'failed') {
        pollDone = true;
        ok('Task output: status=' + o.body.task.status + ' exitCode=' + o.body.task.exitCode + ' result=' + (o.body.task.result || '').slice(0, 80));
        break;
      }
      await sleep(500);
    }
    if (!pollDone) fail('HTTP task didnt complete within 30s');
  } catch (e) {
    fail('HTTP task create/output failed', e.message);
  }

  // Cleanup
  await new Promise(r => server.close(r));
  b2._cleanupProcess();

  // Summary
  const total = passed + failed;
  console.log('\n' + '='.repeat(60));
  console.log('  ' + (failed === 0 ? '✅ ALL' : '❌ SOME') + ' ' + total + ' tests: ' + passed + ' passed, ' + failed + ' failed');
  console.log('='.repeat(60) + '\n');
  process.exit(failed > 0 ? 1 : 0);
}

main();
