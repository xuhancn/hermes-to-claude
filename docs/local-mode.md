# h2c Home Local Mode

Zero-config local collaboration between Hermes and Claude (OOB — Out-Of-Box). Unlike remote mode (manual `/h2c enable` + authentication required), local mode starts **automatically, with no auth, and lives as long as Claude does**.

## Motivation

A general-purpose AI agent (Hermes) cannot remember domain specifics — experience is locked in skill files. h2c Home Local Mode lets Hermes focus on orchestration only, delegating skills, scripts, and workflows to Claude. Claude owns one task at a time with zero memory pollution.

```
Hermes → H2C_HOME=1 → h2c auto-starts → compute port from cwd → connect localhost → send task → read result
Claude → read CLAUDE.md → load skill → execute → respond
```

## Trigger

Hermes sets the environment variable `H2C_HOME=1` and h2c picks it up automatically — zero user action. No MCP config changes, no Claude involvement needed.

```bash
H2C_HOME=1 node dist/h2c.mjs
```

When running as a standalone CLI, h2c auto-starts if no subcommand is given and `H2C_HOME=1`:

```bash
H2C_HOME=1 node dist/h2c.mjs
# → h2c enabled (auto-start)
```

## Behavioral Differences

| | Remote Mode | Home Mode |
|------|-------------|-----------|
| Startup | Manual `/h2c enable` | **Auto-start** (calls `h2c enable` internally) |
| Auth | Basic Auth required (machine key) | **No auth** (localhost trust) |
| Port | hash(cwd) → [9200, 9799] | **hash(cwd)** → [9200, 9799] |
| Listen | All interfaces (0.0.0.0) | **127.0.0.1 only** |
| Lifecycle | Manual `--disable` | **Auto-stop on process exit** (HTTP server lives in same Node process) |

Both modes use the same machine-global key (stored in `~/.h2c_key`); home mode simply skips the auth check.

## Port Mapping

```
port = 9200 + (md5(cwd)[0:2] % 600)
```

Each working directory gets a deterministic port, stable across runs and machines. Hermes computes the same port to connect.

## Implementation

Implemented in `src/hermes_to_claude/home.mjs`:

1. `isHome()` — checks `H2C_HOME == 1` (strict)
2. `homePort(cwd)` — returns `9200 + MD5(cwd)[0:2] % 600` (range [9200, 9799])
3. `homeKey()` — reads/generates machine-global key in `~/.h2c_key`

Server behavior when home mode is active:
- **HTTP server** (`server.mjs`): skips auth, listens on `127.0.0.1`
- **CLI** (`cli.mjs`): auto-starts HTTP server directly (no MCP layer)

## API

Identical to remote mode — only port derivation and auth differ.

## Status

**Implemented and active.** First-class feature, not experimental. See `src/hermes_to_claude/home.mjs` for the implementation and `tests/test_home.mjs` for test coverage.
