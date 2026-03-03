# Troubleshooting

Common issues and how to fix them.

## Common Errors

| Error | Cause | Fix |
|:------|:------|:----|
| `NotInitializedError` | `pylet.init()` not called | Call `pylet.init("http://head:8000")` first |
| `NotFoundError` | Wrong instance name/ID | Check with `pylet.instances()` or `pylet get-instance` |
| `TimeoutError` | Job taking too long | Increase timeout or check resources |
| `ConnectionError` | Can't reach head node | Verify head is running and address is correct |

---

## Instance Stuck in PENDING

**Symptom**: Your job stays in `PENDING` and never starts.

**Cause**: No worker has enough free resources.

**Fix**: Check what's available:

```bash
pylet list-workers
```

Or in Python:

```python
for w in pylet.workers():
    print(f"{w.host}: GPU {w.gpu_available}/{w.gpu}, CPU {w.cpu_available}/{w.cpu}")
```

Common reasons:
- No workers are connected (start one with `pylet start --head ...`)
- All GPUs are in use (wait for other jobs to finish, or add more workers)
- You requested more resources than any single worker has

---

## Instance in UNKNOWN State

**Symptom**: Instance shows `UNKNOWN` status.

**Cause**: The worker running it went offline (stopped sending heartbeats for 90+ seconds).

**What happens next**:
- If the worker comes back → instance recovers to its actual state
- If the worker doesn't come back → you should cancel the instance

```bash
pylet cancel <instance-id>
```

---

## Can't Connect to Head Node

**Symptom**: `ConnectionError` or timeout when calling `pylet.init()`.

**Checklist**:
1. Is the head node running? (`pylet start`)
2. Is the address correct? (default: `http://localhost:8000`)
3. Is the port open? (check firewall rules)
4. If on a different machine, use the head's IP: `pylet.init("http://10.0.0.1:8000")`

---

## Logs Are Empty

**Symptom**: `instance.logs()` returns empty string.

**Possible causes**:
- Instance hasn't started yet (check status first)
- The command produces no output
- Instance is still in ASSIGNED state (worker hasn't started the process yet)

```python
instance.refresh()
print(f"Status: {instance.status}")
if instance.status == "RUNNING":
    print(instance.logs())
```

---

## GPU Not Detected

**Symptom**: Your job can't see GPUs even though you requested them.

**Check**:
1. Did you request GPUs? (`--gpu-units 1` or `gpu=1`)
2. Does the worker have GPUs? (`pylet list-workers`)
3. Your code should see GPUs via `CUDA_VISIBLE_DEVICES` (set automatically by PyLet)

```python
# Debug: print GPU environment
instance = pylet.submit("env | grep CUDA", gpu=1)
instance.wait()
print(instance.logs())
```

---

## Debugging Commands

```bash
# Check cluster health
pylet list-workers

# Check instance details
pylet get-instance --name my-job

# View recent logs
pylet logs <instance-id> --tail 1000

# Follow logs in real-time
pylet logs <instance-id> --follow
```

```python
import pylet
pylet.init()

# All running instances
for inst in pylet.instances(status="RUNNING"):
    print(f"{inst.name}: {inst.endpoint}")

# Resource availability per worker
for w in pylet.workers():
    print(f"{w.host} ({w.status}): "
          f"GPU {w.gpu_available}/{w.gpu}, "
          f"CPU {w.cpu_available}/{w.cpu}, "
          f"MEM {w.memory_available}/{w.memory} MB, "
          f"Free GPU indices: {w.gpu_indices_available}")
```
