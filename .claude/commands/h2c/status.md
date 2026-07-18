# /h2c status

Show the current h2c server status, including server version, port, key, LAN IPs, and last client connection info.

## Usage

```
/h2c status
```

## MCP tool

Calls `h2c_status()` with no arguments.

## Examples

- `/h2c status` — show status + last client connection info

## Output fields

- Version (from esbuild build define)
- Status: enabled or disabled
- Port and deterministic key
- LAN IP addresses
- Last client IP and activity timestamp (if any)
