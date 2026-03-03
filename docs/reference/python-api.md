# Python API Reference

Everything you can do with `import pylet`.

## Quick Overview

```python
import pylet

pylet.init()                               # Connect to head node
instance = pylet.submit("cmd", gpu=1)      # Submit a job
instance.wait_running()                    # Wait until running
print(instance.endpoint)                   # Get endpoint
print(instance.logs())                     # Get logs
instance.cancel()                          # Cancel
instance.wait()                            # Wait until done
```

---

## Module Functions

### `pylet.init(address)` {#init}

Connect to the head node. **Must be called before anything else.**

```python
pylet.init()                                # Default: localhost:8000
pylet.init("http://192.168.1.10:8000")      # Remote head node
```

---

### `pylet.submit(command, **kwargs)` {#submit}

Submit a new instance. Returns an `Instance` handle.

```python
def submit(
    command: str | list[str],
    *,
    name: str | None = None,
    gpu: int = 0,
    cpu: int = 1,
    memory: int = 512,
    target_worker: str | None = None,
    gpu_indices: list[int] | None = None,
    exclusive: bool = True,
    labels: dict[str, str] | None = None,
    env: dict[str, str] | None = None,
    venv: str | None = None,
) -> Instance
```

**Examples:**

```python
# Basic: run a command
instance = pylet.submit("echo hello")

# GPU training job
instance = pylet.submit(
    "python train.py --epochs 10",
    gpu=2, cpu=8, memory=16384,
    name="training-job"
)

# Deploy a service (use $PORT for service discovery)
instance = pylet.submit(
    "vllm serve Qwen/Qwen2.5-1.5B-Instruct --port $PORT",
    gpu=1, memory=4096,
    name="my-vllm"
)

# Target specific GPUs on a specific worker
instance = pylet.submit(
    "python inference.py",
    gpu_indices=[0, 1],
    target_worker="gpu-node-0",
    labels={"model": "llama"},
    env={"HF_TOKEN": "xxx"}
)

# Use a virtual environment
instance = pylet.submit(
    "python script.py",
    venv="/shared/venvs/ml-env",
    gpu=1
)
```

**Parameters:**

| Parameter | Type | Description | Default |
|:----------|:-----|:------------|:--------|
| `command` | `str \| list[str]` | Shell command to run | *(required)* |
| `name` | `str \| None` | Instance name (unique, for lookup) | `None` |
| `gpu` | `int` | Number of GPUs | `0` |
| `cpu` | `int` | Number of CPU cores | `1` |
| `memory` | `int` | Memory in MB | `512` |
| `target_worker` | `str \| None` | Pin to a specific worker | `None` |
| `gpu_indices` | `list[int] \| None` | Request specific GPU indices | `None` |
| `exclusive` | `bool` | Exclusive GPU access | `True` |
| `labels` | `dict` | Custom metadata | `None` |
| `env` | `dict` | Environment variables | `None` |
| `venv` | `str \| None` | Virtualenv path (absolute) | `None` |

::: info
`gpu` and `gpu_indices` are **mutually exclusive**. Use `gpu` for "give me N GPUs" and `gpu_indices` for "give me GPU 0 and GPU 2 specifically".
:::

---

### `pylet.get(name, *, id)` {#get}

Retrieve an existing instance by name or ID.

```python
instance = pylet.get("my-vllm")                    # By name
instance = pylet.get(id="abc-123-def")              # By ID
```

---

### `pylet.instances(*, status, labels)` {#instances}

List all instances, with optional filters.

```python
all_instances = pylet.instances()
running = pylet.instances(status="RUNNING")
gpu_jobs = pylet.instances(labels={"type": "gpu-worker"})
```

---

### `pylet.workers()` {#workers}

List all registered workers.

```python
for worker in pylet.workers():
    print(f"{worker.host}: {worker.gpu_available}/{worker.gpu} GPUs free")
```

---

### `pylet.delete(name, *, id)` / `pylet.delete_all(*, status)` {#delete}

Delete instances.

```python
pylet.delete("my-instance")                  # Delete by name
pylet.delete(id="abc-123-def")               # Delete by ID
count = pylet.delete_all(status="COMPLETED") # Delete all completed
count = pylet.delete_all()                   # Delete ALL (careful!)
```

---

### `pylet.delete_worker(worker_id)` / `pylet.delete_all_offline_workers()` {#delete-worker}

Delete workers. Only OFFLINE workers can be deleted.

```python
pylet.delete_worker("worker-123")
count = pylet.delete_all_offline_workers()
```

---

### `pylet.shutdown()` {#shutdown}

Close connection. Optional — called automatically when the program exits.

---

### `pylet.is_initialized()` {#is-initialized}

Check if `init()` has been called.

```python
if not pylet.is_initialized():
    pylet.init()
```

---

## Instance Object {#instance}

Returned by `pylet.submit()` and `pylet.get()`.

### Properties

| Property | Type | Description |
|:---------|:-----|:------------|
| `id` | `str` | Unique UUID |
| `name` | `str \| None` | User-provided name |
| `status` | `str` | Current state: `PENDING`, `ASSIGNED`, `RUNNING`, `COMPLETED`, `FAILED`, `CANCELLED`, `UNKNOWN` |
| `display_status` | `str` | User-facing status (shows `CANCELLING` when applicable) |
| `endpoint` | `str \| None` | `"host:port"` when running |
| `exit_code` | `int \| None` | Process exit code when done |
| `gpu_indices` | `list[int] \| None` | Allocated GPU indices |
| `exclusive` | `bool` | Whether GPUs are exclusive |
| `labels` | `dict[str, str]` | Custom metadata |
| `env` | `dict[str, str]` | Environment variables |
| `target_worker` | `str \| None` | Target worker constraint |

### Methods

#### `instance.wait_running(timeout=300)` {#wait-running}

Block until the instance reaches `RUNNING` state.

```python
instance.wait_running()           # Wait up to 5 minutes (default)
instance.wait_running(timeout=60) # Wait up to 60 seconds
```

Raises `TimeoutError` if not running in time, or `InstanceFailedError` if it fails.

---

#### `instance.wait(timeout=None)` {#wait}

Block until the instance reaches a terminal state (`COMPLETED`, `FAILED`, or `CANCELLED`).

```python
instance.wait()             # Wait forever
instance.wait(timeout=3600) # Wait up to 1 hour
```

---

#### `instance.cancel(delete=False)` {#cancel}

Request cancellation. Returns immediately (cancellation happens asynchronously).

```python
instance.cancel()            # Cancel only
instance.cancel(delete=True) # Cancel and delete after
```

---

#### `instance.logs(tail=None)` {#logs}

Get instance logs.

```python
full_logs = instance.logs()           # All logs
recent = instance.logs(tail=1000)     # Last 1000 bytes
```

---

#### `instance.refresh()` {#refresh}

Fetch latest state from the server. Updates all properties.

```python
instance.refresh()
print(instance.status)  # Now reflects the latest state
```

---

## WorkerInfo Object {#workerinfo}

Returned by `pylet.workers()`. Read-only.

| Property | Type | Description |
|:---------|:-----|:------------|
| `id` | `str` | Worker UUID |
| `host` | `str` | IP address |
| `status` | `str` | `ONLINE`, `SUSPECT`, or `OFFLINE` |
| `gpu` / `gpu_available` | `int` | Total / available GPUs |
| `cpu` / `cpu_available` | `int` | Total / available CPU cores |
| `memory` / `memory_available` | `int` | Total / available memory (MB) |
| `gpu_indices_available` | `list[int]` | Which GPU indices are free |

---

## Cluster Management (In-Process) {#cluster}

### `pylet.start(**kwargs)`

Start a head or worker node in-process. Useful for programmatic deployment.

```python
# Start head in background thread
head = pylet.start(port=8000)
# head.address => "http://localhost:8000"
head.stop()

# Start worker in background thread
worker = pylet.start(address="http://head:8000", gpu=4)
worker.stop()

# Start in foreground (blocks forever)
pylet.start(port=8000, block=True)
```

---

### `pylet.local_cluster(workers, **kwargs)`

Start a head + workers locally. Perfect for testing.

```python
with pylet.local_cluster(workers=2, gpu_per_worker=1) as cluster:
    # pylet is auto-initialized
    inst = pylet.submit("nvidia-smi", gpu=1)
    inst.wait()
    print(inst.logs())
# Cluster auto-cleaned up
```

| Parameter | Default | Description |
|:----------|:--------|:------------|
| `workers` | `1` | Number of workers |
| `gpu_per_worker` | `0` | GPUs per worker |
| `cpu_per_worker` | `4` | CPU cores per worker |
| `memory_per_worker` | `4096` | Memory per worker (MB) |
| `port` | `8000` | Head node port |

---

## Exceptions {#exceptions}

```python
from pylet import (
    PyletError,              # Base exception
    NotInitializedError,     # pylet.init() not called
    NotFoundError,           # Instance/worker not found
    TimeoutError,            # Operation timed out
    InstanceFailedError,     # Instance FAILED/CANCELLED
    InstanceTerminatedError, # Invalid op on terminal instance
)
```

**Common error handling pattern:**

```python
import pylet
from pylet import TimeoutError, InstanceFailedError, NotFoundError

pylet.init()

try:
    instance = pylet.submit("python might_fail.py", gpu=1)
    instance.wait(timeout=60)
except TimeoutError:
    print("Timed out, cancelling...")
    instance.cancel()
    instance.wait()
except InstanceFailedError as e:
    print(f"Failed with exit code {e.instance.exit_code}")
    print(e.instance.logs())
```

---

## Async API {#async}

All functions are available as async in `pylet.aio`:

```python
import asyncio
import pylet.aio as pylet

async def main():
    await pylet.init()

    # Submit multiple concurrently
    instances = await asyncio.gather(
        pylet.submit("task1.py", gpu=1),
        pylet.submit("task2.py", gpu=1),
        pylet.submit("task3.py", gpu=1),
    )

    # Wait for all
    await asyncio.gather(*[inst.wait() for inst in instances])

    for inst in instances:
        print(f"{inst.name}: {inst.status}")

asyncio.run(main())
```

Same signatures as the sync API, but everything is `async def` / `await`.
