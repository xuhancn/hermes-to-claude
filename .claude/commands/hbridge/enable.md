# /hbridge enable

Start the hbridge server. The access key is derived deterministically from the working directory. In home mode (HBRIDGE_HOME=1), the server auto-starts without `--enable` and no authentication is required.

## Usage

```
/hbridge enable
```

## MCP tool

Calls `hbridge_enable()` with no arguments. Key is auto-derived from cwd.

## Examples

- `/hbridge enable` — start server, show deterministic key

## Notes

- Port range: 9200–9799 (derived from directory hash via `homePort()`)
- Key: random `hb_` + 8 base52 chars — generated once, stored in `~/.hbridge_key` (same key for all directories)
- In home mode (HBRIDGE_HOME=1), auth is skipped — key is still generated but not checked
- The startup banner shows the key, port, and LAN IP addresses
