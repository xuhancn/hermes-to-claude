# Windows Verification Steps

## Step 1: Clone

```powershell
cd %TEMP%
git clone https://github.com/xuhancn/hermes-to-claude.git h2c-verify
cd h2c-verify
dir
```

## Step 2: Install (build + MCP + statusLine)

```powershell
npm install
```

Verify:
- `dir dist\h2c.mjs` exists
- `dir dist\statusline.mjs` exists
- `%USERPROFILE%\.claude.json` has `mcpServers.h2c`
- `%USERPROFILE%\.claude\settings.json` has `statusLine.command`

## Step 3: Global install

```powershell
npm install -g .
where h2c
h2c --help
```

## Step 4: Start in Claude Code

Open Claude Code, run: `enable h2c for user testuser`

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

Claude Code bottom-right corner: `h2c: on | :9190`

## Step 8: Cleanup

```powershell
rd /s /q h2c_tasks 2>nul
del %USERPROFILE%\.h2c_state.json 2>nul
```
