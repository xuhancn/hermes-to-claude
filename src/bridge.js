#!/usr/bin/env node
/**
 * Hermes-Claude Bridge — 最简版
 * 不依赖 Claude Code 源码，只实现 TaskCreate/TaskGet/TaskOutput 协议
 */

import { spawn } from 'child_process';
import { createInterface } from 'readline';

const tasks = new Map();
let taskId = 0;

// Claude Code MCP 协议 — stdio JSON-RPC
process.stdin.setEncoding('utf8');
const rl = createInterface({ input: process.stdin });

rl.on('line', (line) => {
  try {
    const msg = JSON.parse(line);
    handle(msg);
  } catch {}
});

function respond(id, result) {
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, result }) + '\n');
}

async function handle(msg) {
  const { method, params, id } = msg;

  if (method === 'task/create') {
    const tid = `task_${++taskId}`;
    tasks.set(tid, {
      id: tid,
      subject: params.subject,
      description: params.description,
      status: 'pending',
      created: Date.now(),
    });
    respond(id, { task_id: tid, status: 'created' });

    // 启动 Claude Code 子进程处理任务
    const child = spawn('npx', ['@anthropic-ai/claude-code', '-p', params.description], {
      cwd: process.env.PROJECT_ROOT || process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let output = '';
    child.stdout.on('data', d => output += d);
    child.on('close', code => {
      const task = tasks.get(tid);
      task.status = 'completed';
      task.result = output;
      task.exitCode = code;
    });
  }

  if (method === 'task/status') {
    const task = tasks.get(params.task_id);
    respond(id, task ? { status: task.status, subject: task.subject } : { error: 'not found' });
  }

  if (method === 'task/output') {
    const task = tasks.get(params.task_id);
    respond(id, task ? {
      retrieval_status: task.status === 'completed' ? 'success' : 'pending',
      task: { id: task.id, status: task.status, result: task.result, exitCode: task.exitCode },
    } : { error: 'not found' });
  }
}
