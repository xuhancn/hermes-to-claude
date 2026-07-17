# /hbridge status_bar

Show or hide the hbridge status indicator in the Claude Code status bar (bottom-right corner). When enabled, hbridge attaches to any existing status bar you may have configured.

## Usage

```
/hbridge status_bar on
/hbridge status_bar off
```

## MCP tool

Calls `hbridge_status_bar({"action":"on|off"})` with the specified action.

## Examples

- `/hbridge status_bar on` — attach hbridge status to your status bar
- `/hbridge status_bar off` — remove hbridge from your status bar, restore original

## Notes

- The hbridge status indicator is **disabled by default** after installation
- When ON, hbridge output is appended to your existing bar with a `│` separator
- Example: `main │ ▶️ hbridge: on | :9761`
