# Windows Verification Steps

Execute each step in order. Stop on first failure.

## Step 1: Clone

```powershell
cd %TEMP%
git clone https://github.com/xuhancn/hermes-claude-bridge.git hbridge-verify
cd hbridge-verify
```

Verify: `dir` shows `package.json`, `src/hbridge/`, `build.mjs`.

## Step 2: Install (includes build + MCP registration + statusLine)

```powershell
npm install
```

Verify:
- Exit code 0
- `dir dist\hbridge.mjs` exists (from preinstall build)
- `dir dist\statusline.mjs` exists
- `%USERPROFILE%\.claude.json` has `mcpServers.hbridge`
- `%USERPROFILE%\.claude\settings.json` has `statusLine.command`

## Step 3: Global install

```powershell
npm install -g .
```

Verify: `where hbridge` or `hbridge --help` works.

Note: Run as Administrator if you get EACCES/EPERM.

## Step 4: Start hbridge in Claude Code

```powershell
claude
# In Claude: "enable hbridge for user testuser"
```

Claude 调 MCP `hbridge_enable` 工具 → HTTP server on :9190 自动启动。

Verify:
- 返回密钥 `hb_XXXX-XXXX`
- `curl http://localhost:9190/health` → `{"status":"ok"}`

## Step 5: Create task via HTTP

```powershell
set KEY=hb_XXXX-XXXX
curl -X POST http://localhost:9190/v1/task/create ^
  -H "Authorization: Basic %KEY%" ^
  -H "Content-Type: application/json" ^
  -d "{\"prompt\":\"echo hello\"}"
```

Expected: `{"task_id":"task_...","status":"created"}`

## Step 6: Poll for output

```powershell
curl "http://localhost:9190/v1/task/output?task_id=task_xxxx"
```

Expected: `{"retrieval_status":"success","task":{"status":"done","result":"..."}}`

## Step 7: Verify statusLine

Check Claude Code bottom-right corner:
- Before enable: `hbridge: off`
- After enable: `hbridge: on | :9190`
- After task: `hbridge: on | :9190 | ✅"echo hello"`

Also check chat log:
```powershell
type %USERPROFILE%\.hbridge_chat.log
```

## Step 8: Cleanup

```powershell
# In Claude: hbridge disable
rd /s /q hbridge_tasks 2>nul
del %USERPROFILE%\.hbridge_state.json 2>nul
del %USERPROFILE%\.hbridge_chat.log 2>nul
```
