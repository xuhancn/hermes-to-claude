# H-Bridge — Hermes Integration Guide

*For Hermes Agent. How to connect, authenticate, and control hbridge.*

## Connection

```bash
# User gives you:
#   addr: 192.168.27.243:9190
#   user: xu
#   key:  hb_KxVq-RmZp

# Authenticate
BASE64=$(echo -n "xu:hb_KxVq-RmZp" | base64)

# Health check
curl http://192.168.27.243:9190/health -H "Authorization: Basic $BASE64"
# → {"status":"ok"}
```

## API

| Endpoint | Method | Body | Returns |
|----------|--------|------|---------|
| `/health` | GET | — | `{"status":"ok"}` |
| `/v1/task/create` | POST | `{"prompt":"..."}` | `{"task_id":"task_..."}` |
| `/v1/task/output?task_id=...` | GET | — | `{"retrieval_status":"success","task":{...}}` |

## Usage (from Hermes)

```python
import requests, base64

ADDR = "192.168.27.243:9190"
AUTH = base64.b64encode(b"xu:hb_KEY").decode()
HEADERS = {"Authorization": f"Basic {AUTH}"}

# Create task
r = requests.post(f"http://{ADDR}/v1/task/create", 
    json={"prompt": "Fix StockMan bug"},
    headers=HEADERS)
task_id = r.json()["task_id"]

# Poll for output
while True:
    r = requests.get(f"http://{ADDR}/v1/task/output?task_id={task_id}",
        headers=HEADERS)
    d = r.json()
    if d["retrieval_status"] == "success":
        print(d["task"]["result"])
        break
    time.sleep(5)
```

## Hermes Config

```yaml
# ~/.hermes/config.yaml
hbridge:
  dev:
    addr: 192.168.27.243:9190
    user: xu
    key: hb_KxVq-RmZp
```

## Security

- Default-off. User must `/mcp hbridge enable` before Hermes can connect.
- Key displayed once. User dictates to Hermes operator.
- Key uses Base52, 45.6-bit entropy.
