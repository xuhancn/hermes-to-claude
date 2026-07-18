# hbridge Home Local Mode

Zero-config local collaboration between Hermes and Claude (OOB — Out-Of-Box). Unlike remote mode (manual `--enable` + authentication required), local mode starts **automatically, with no auth, and lives as long as Claude does**.

## Motivation

A general-purpose AI agent (Hermes) cannot remember domain specifics — experience is locked in skill files. hbridge Home Local Mode lets Hermes focus on orchestration only, delegating skills, scripts, and workflows to Claude. Claude owns one task at a time with zero memory pollution.

```
Hermes → HBRIDGE_HOME=1 → hbridge auto-starts → compute port from cwd → connect localhost → send task → read result
Claude → read CLAUDE.md → load skill → execute → respond
```

## Trigger

Hermes sets the environment variable `HBRIDGE_HOME=1` and hbridge picks it up automatically — zero user action. No MCP config changes, no Claude involvement needed.

```bash
HBRIDGE_HOME=1 node dist/hbridge.mjs
```

When running as a standalone CLI, hbridge auto-starts if no subcommand is given and `HBRIDGE_HOME=1`:

```bash
HBRIDGE_HOME=1 node dist/hbridge.mjs
# → hbridge enabled (auto-start)
```

## Behavioral Differences

| | Remote Mode | Home Mode |
|------|-------------|-----------|
| Startup | Manual `--enable` or `/hbridge enable` | **Auto-start** with MCP or no-arg CLI |
| Auth | Basic Auth required (machine key) | **No auth** (localhost trust) |
| Port | hash(cwd) → [9200, 9799] | **hash(cwd)** → [9200, 9799] |
| Listen | All interfaces (0.0.0.0) | **127.0.0.1 only** |
| Lifecycle | Manual `--disable` | **Auto-stop on Claude exit** |

Both modes use the same machine-global key (stored in `~/.hbridge_key`); home mode simply skips the auth check.

## Port Mapping

```
port = 9200 + (md5(cwd)[0:2] % 600)
```

Each working directory gets a deterministic port, stable across runs and machines. Hermes computes the same port to connect.

## Implementation

Implemented in `src/hbridge/home.mjs`:

1. `isHome()` — checks `HBRIDGE_HOME == 1` (strict)
2. `homePort(cwd)` — returns `9200 + MD5(cwd)[0:2] % 600` (range [9200, 9799])
3. `homeKey()` — reads/generates machine-global key in `~/.hbridge_key`

Server behavior when home mode is active:
- **HTTP server** (`server.mjs`): skips auth, listens on `127.0.0.1`
- **MCP server** (`mcp.mjs`): auto-starts the HTTP inbox without needing `hbridge_enable`
- **CLI** (`cli.mjs`): blocks manual `--enable`/`--disable`, auto-starts when no subcommand given

## API

Identical to remote mode — only port derivation and auth differ.

## Status

**Implemented and active.** First-class feature, not experimental. See `src/hbridge/home.mjs` for the implementation and `tests/test_home.mjs` for test coverage.
