# H-Bridge (hbridge) v1 Design

`hbridge` = Hermes Bridge = 韩的桥 — 独立于 Claude Code 官方 `/bridge` 命令。

## Architecture

```
Hermes Agent
    │
    │  HTTP :9190
    ▼
  hbridge ──spawn──▶ Claude Code CLI
    │
  Auth (独立账户系统)
  Users (add/del/key/list)
```

- HTTP 统一: 本地 `127.0.0.1:9190`, 远程 SSH tunnel
- 认证独立: 不碰系统 `/etc/passwd`, 内置用户管理
- 默认关闭: `--enable` 启动, `--disable` 关闭

## CLI Commands

```
hbridge --enable            Start bridge + show key + start status bar
hbridge --disable           Stop bridge, freeze all users
hbridge --status            Detailed diagnostic output
hbridge --user add <name>   Add user → generate hb_ key (shown once)
hbridge --user del <name>   Delete user
hbridge --user key <name>   Regenerate key for user
hbridge --user list         List all users
```

## Startup Flow

```
$ hbridge --enable

  ╔══════════════════════════════════╗
  ║  ⚠ H-Bridge enabled             ║
  ║  Remote access is now allowed    ║
  ║                                  ║
  ║  User:   xu                      ║
  ║  Key:    hb_KxVq-RmZp           ║
  ║  Addr:   127.0.0.1:9190          ║
  ║         192.168.27.243:9190     ║
  ║                                  ║
  ║  Save this key — shown once      ║
  ╚══════════════════════════════════╝

  hbridge :9190 | xu, han | 3 tasks | cpu 12% | mem 87MB | ↑ 15min
```

## Key Format

```
hb_XXXX-XXXX
  ↑   ↑  ↑
  │   8 chars Base52 (A-Za-z)
  │   Dash separator like serial keys
  Hermes Bridge prefix (like GitHub's gh_)
```

- Base52: 52 characters (A-Z a-z)
- 8 characters = 52^8 ≈ 45.6 bits entropy
- Short enough to dictate verbally: "hb KxVq-RmZp"
- Generated on first `--user add`, displayed once only

## Status Bar

```
Bridge :9190 | xu, han | 3 tasks | cpu 12% | mem 87MB | ↑ 15min
```

- Single line, always visible (like Claude Code token counter)
- Real-time refresh

## Hermes Configuration

```
hermes bridge add dev \
  --addr 192.168.27.243:9190 \
  --user xu \
  --key hb_KxVq-RmZp
```

## Security

- Disabled by default — no attack surface when off
- Two layers: SSH (network) + hbridge (application)
- No certificates, no key files, no system user integration
- 45.6-bit key — sufficient for local/SSH-tunneled access

## Open Source

Target: MIT License — 功能完备后才考虑开源
