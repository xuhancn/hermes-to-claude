# Windows Verification Steps

Execute each step in order. Stop on first failure.

## Step 1: Clone

```bash
cd %TEMP%
git clone https://github.com/xuhancn/hermes-claude-bridge.git hbridge-verify
cd hbridge-verify
```

Verify: `dir` shows `package.json`, `src/`, `build.mjs`, etc.

## Step 2: Install (includes build + MCP registration)

```bash
npm install
```

Verify:
- Exit code 0
- `dir dist\hbridge.mjs` exists (from `preinstall: npm run build`)
- Check `%USERPROFILE%\.claude.json` contains `"hbridge"` in `mcpServers` (from `postinstall: scripts/setup-mcp.cjs`)

## Step 3: Global install

```bash
npm install -g .
```

Verify: `where hbridge` or `hbridge --help` works.

Note: On Windows this may need an admin shell. If `npm install -g .` fails with EACCES/EPERM, try running the terminal as Administrator.

## Step 4: Start service

```bash
node dist/hbridge.mjs --enable testuser
```

Verify: Console displays:
- `"H-Bridge enabled"`
- A key in format `hb_XXXX-XXXX`
- Address `127.0.0.1:9190`

Capture the key for Step 6. The service runs in the foreground — send to background or use a separate terminal.

## Step 5: Health check

```bash
curl http://localhost:9190/health
```

Expected: `{"status":"ok"}`

## Step 6: Task create

```bash
set KEY=hb_XXXX-XXXX
set BASE64KEY=%KEY%
curl -X POST http://localhost:9190/v1/task/create ^
  -H "Authorization: Basic %BASE64KEY%" ^
  -H "Content-Type: application/json" ^
  -d "{\"prompt\":\"echo hello\"}"
```

Where `%BASE64KEY%` = base64(`testuser:hb_XXXX-XXXX`).

Expected: `{"task_id":"task_..."}`

## Step 7: Task output

```bash
curl "http://localhost:9190/v1/task/output?task_id=task_xxxx"
```

Expected: `{"retrieval_status":"success","task":{...}}`

## Step 8: Cleanup

```bash
# Stop the hbridge service (Ctrl+C in its terminal)
# Remove test user
rd /s /q hbridge_tasks 2>nul
del hbridge_users.json 2>nul
```
