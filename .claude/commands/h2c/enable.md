# /h2c enable

> Run h2c enable directly — do NOT read source code or search files. Just execute the command and report the output.

Start the h2c server. The access key is derived deterministically from the working directory. In home mode (H2C_HOME=1), the server auto-starts without `enable` and no authentication is required.

## Usage

```
/h2c enable
```

## MCP tool

Runs `node dist/hbridge.mjs --enable`. Key is auto-derived from cwd.

## Examples

- `/h2c enable` — start server, show deterministic key

## Notes

- Port range: 9200–9799 (derived from directory hash via `homePort()`)
- Key: random `hb_` + 8 base52 chars — generated once, stored in `~/.h2c_key` (same key for all directories)
- In home mode (H2C_HOME=1), auth is skipped — key is still generated but not checked
- The startup banner shows the key, port, and LAN IP addresses
