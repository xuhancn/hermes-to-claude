# /h2c enable

> Single command: `node dist/hbridge.mjs enable`
> If port conflict — just report running status, no retry.

Runs `node dist/hbridge.mjs enable`. Key is auto-derived from cwd.

Do not read files, do not explore, do not wait. Just run and report output immediately.

If output contains "EADDRINUSE" or "port already in use", report:
`h2c is already running, here's the status:` followed by the existing server info (key, port, uptime).

Do not run a second command, do not run health check / self-diagnose, do not add commentary.
