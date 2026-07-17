# hbridge Home Local Mode — Design

> **⚠️ EXPERIMENTAL** — Design phase, not yet implemented. API subject to change.

Zero-config local collaboration between Hermes and Claude (OOB — Out-Of-Box). Unlike remote mode (manual `enable` + authentication required), local mode starts **automatically, no auth, and lives as long as Claude does**.

## Motivation

A general-purpose AI agent (Hermes) cannot remember domain specifics — experience is locked in skill files. hbridge Home Local Mode lets Hermes focus on orchestration only, delegating skills, scripts, and workflows to Claude. Claude owns one task at a time with zero memory pollution.

```
Hermes → compute port → connect localhost → send task + skill → read result
Claude → read CLAUDE.md → load skill → execute → respond
```

## Trigger

Hermes sets the environment variable `HBRIDGE_HOME=1` and hbridge picks it up automatically — zero user action. No MCP config changes, no Claude involvement needed.

```bash
HBRIDGE_HOME=1 node dist/hbridge.mjs --stdio
```

## Behavioral Differences

| | Remote Mode | Local Mode |
|------|-------------|------------|
| Startup | Manual `enable hbridge` | **Auto-start** |
| Auth | Basic Auth required | **No auth** (127.0.0.1) |
| Port | Fixed 9190 | **hash(cwd)** |
| Lifecycle | Manual disable | **Auto-stop on Claude exit** |

## Port Mapping

```
port = 9200 + (md5(cwd)[0:2] % 600)
```

Each working directory gets a deterministic port. Hermes computes the same port to connect.

## Implementation Notes

1. Detect `HBRIDGE_HOME=1` → auto-start HTTP server (no `enable` needed)
2. Auth middleware: `if HBRIDGE_HOME` → skip auth
3. Port = hash(cwd), not fixed 9190
4. `process.on("exit")` → auto-shutdown server

## API

Identical to remote mode — only the port (and no auth) differs.

## Status

**Design phase** — not yet implemented.
