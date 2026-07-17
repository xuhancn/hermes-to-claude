# /hbridge enable

Start the hbridge server. The access key is derived deterministically from the working directory. In home mode (HBRIDGE_HOME=1), no authentication is required.

## Usage

```
/hbridge enable
```

## MCP tool

Calls `hbridge_enable()` with no arguments. Key is auto-derived from cwd.

## Examples

- `/hbridge enable` — start server, show deterministic key

## Notes

- Port range: 9200–9799 (derived from directory hash)
- Key format: `hb_` + base52(MD5(cwd)[4:10])
- The startup banner shows the key, port, and LAN IP addresses
