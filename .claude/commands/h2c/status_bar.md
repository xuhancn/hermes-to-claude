# /h2c status_bar

> Run the h2c command directly — no exploration.

Show or hide the h2c status indicator in the Claude Code status bar (bottom-right corner). When enabled, h2c attaches to any existing status bar you may have configured.

## Usage

```
/h2c status_bar on
/h2c status_bar off
```

## MCP tool

Calls `h2c_status_bar({"action":"on|off"})` with the specified action.

## Examples

- `/h2c status_bar on` — attach h2c status to your status bar
- `/h2c status_bar off` — remove h2c from your status bar, restore original

## Notes

- The h2c status indicator is **disabled by default** after installation
- When ON, h2c output is appended to your existing bar with a `│` separator
- Example: `main │ ▶️ h2c: on | :9761`
