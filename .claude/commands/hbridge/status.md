# /hbridge status

Show the current hbridge server status, including server version, port, key, LAN IPs, and last client connection info.

## Usage

```
/hbridge status
```

## MCP tool

Calls `hbridge_status()` with no arguments.

## Examples

- `/hbridge status` — show status + last client connection info

## Output fields

- Version (from esbuild build define)
- Status: enabled or disabled
- Port and deterministic key
- LAN IP addresses
- Last client IP and activity timestamp (if any)
