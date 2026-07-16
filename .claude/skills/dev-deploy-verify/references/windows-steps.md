# Windows Verification Steps

## Step 1: Clone

```powershell
cd %TEMP%
git clone https://github.com/xuhancn/hermes-claude-bridge.git hbridge-verify
cd hbridge-verify
dir
```

## Step 2: Install (build + MCP + statusLine)

```powershell
npm install
```

Verify:
- `dir dist\hbridge.mjs` exists
- `dir dist\statusline.mjs` exists
- `%USERPROFILE%\.claude.json` has `mcpServers.hbridge`
- `%USERPROFILE%\.claude\settings.json` has `statusLine.command`

## Step 3: Global install

```powershell
npm install -g .
where hbridge
hbridge --help
```

## Step 4: Start in Claude Code

Open Claude Code, run: `enable hbridge for user testuser`

Verify:
- Returns key `hb_XXXX-XXXX`
- `curl http://localhost:9190/health` → `{"status":"ok"}`

## Step 5: Create task

```powershell
set KEY=hb_XXXX-XXXX
curl -X POST http://localhost:9190/v1/task/create ^
  -H "Authorization: Basic %KEY%" ^
  -H "Content-Type: application/json" ^
  -d "{\"prompt\":\"echo hello\"}"
```

Expected: `{"task_id":"task_...","status":"created"}`

## Step 6: Poll output

```powershell
curl "http://localhost:9190/v1/task/output?task_id=task_xxxx"
```

Expected: `{"retrieval_status":"success","task":{"status":"done","result":"..."}}`

## Step 7: Check statusLine

Claude Code bottom-right corner: `hbridge: on | :9190`

## Step 8: Cleanup

```powershell
rd /s /q hbridge_tasks 2>nul
del %USERPROFILE%\.hbridge_state.json 2>nul
```
