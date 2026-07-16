---
name: dev-deploy-verify
description: Verify that hbridge installs and runs correctly on the current platform. Use this skill whenever the user asks to verify deployment, test setup steps, record installation procedures, or validate cross-platform compatibility (Windows/Linux/macOS). Also use when the user finds issues during setup and needs root-cause analysis and fixes.
---

# Dev Deploy Verify

Verify that hbridge can be deployed from a fresh clone through to a running HTTP service. Run on Windows first, then Linux and macOS.

## Process

1. **Detect platform** via `process.platform` or `os.platform()`: `win32`, `linux`, `darwin`
2. **Read platform steps** from `references/{platform}-steps.md`
3. **Execute each step in sequence** — each step runs as a bash command with verification
4. **On failure**: Stop, report the error, root-cause, and fix — then retry from the failed step
5. **On all-pass**: Report success and offer to update README.md

## Cross-platform notes

- Windows: `where` for command lookup, `curl` (PowerShell or native), admin terminal may be needed for `npm install -g`
- Linux/macOS: `which` for command lookup, `curl` for HTTP, `sudo npm install -g .` for global install
- The `preinstall` hook (`npm run build`) and `postinstall` hook (`scripts/setup-mcp.cjs`) run automatically on `npm install`
- If `--ignore-scripts` was used, guide user to run `npm run build && node scripts/setup-mcp.cjs` manually

## Manual configuration path

When the automatic hooks fail or are skipped:
1. Build manually: `npm run build`
2. Register MCP manually: Add to `~/.claude.json` or use `/mcp add hbridge -- node dist/hbridge.mjs --stdio`
3. Verify with: `node dist/hbridge.mjs --stdio` then test with `/mcp list` in Claude Code
