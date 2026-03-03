# Core Concepts

The key ideas you need to understand PyLet.

## The Big Picture

PyLet is a **head-worker** system:

```
┌─────────────────────────────────────────────────────────────┐
│                        HEAD NODE                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │  REST API   │  │  Scheduler  │  │  SQLite Database    │ │
│  │  (FastAPI)  │  │  (Resource) │  │  (State Persistence)│ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
              Long-poll heartbeat protocol
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   WORKER 0   │    │   WORKER 1   │    │   WORKER 2   │
│  GPU: 0,1,2,3│    │  GPU: 0,1    │    │  GPU: 0,1,2,3│
└──────────────┘    └──────────────┘    └──────────────┘
```

- **Head node** — The "manager". Receives your job requests, decides which worker should run them, stores all state in SQLite.
- **Workers** — The "machines". Each worker registers with the head, reports what resources it has, and runs the jobs assigned to it.
- **You** — Submit jobs via CLI or Python API. The head figures out the rest.

---

## Instances

An **instance** is PyLet's single core concept — it's a process that runs on a worker with allocated resources.

When you run:

```bash
pylet submit "python train.py" --gpu-units 2 --name my-training
```

You're creating an instance. It has:

- A **command** to run (`python train.py`)
- **Resource requirements** (2 GPUs)
- A **name** for easy lookup (`my-training`)
- A **lifecycle** (see below)

::: info One Concept
PyLet intentionally has only one concept: **instances**. No pods, replicas, services, or deployments. This keeps things simple.
:::

### Instance Lifecycle

Every instance goes through these states:

```
PENDING ──► ASSIGNED ──► RUNNING ──► COMPLETED (exit code = 0)
                │            │
                │            ├──► FAILED (exit code ≠ 0)
                │            │
                │            └──► CANCELLED (you cancelled it)
                │
                └──► UNKNOWN (worker went offline)
```

| State | What's Happening | Is It Done? |
|:------|:-----------------|:------------|
| `PENDING` | Waiting in queue for a worker with enough resources | No |
| `ASSIGNED` | A worker has been chosen, resources reserved | No |
| `RUNNING` | Your command is actually running | No |
| `COMPLETED` | Finished successfully (exit code 0) | **Yes** |
| `FAILED` | Finished with an error (exit code ≠ 0) | **Yes** |
| `CANCELLED` | You cancelled it | **Yes** |
| `UNKNOWN` | The worker running it went offline; outcome uncertain | No |

::: tip
If your instance is stuck in `PENDING`, it usually means no worker has enough free resources. Check with `pylet list-workers`.
:::

---

## Workers

A **worker** is a machine (or process) that runs instances. When you start a worker, you tell it how many resources it has:

```bash
pylet start --head 10.0.0.1:8000 --gpu-units 4 --cpu-cores 16 --memory-mb 65536
```

This registers a worker with 4 GPUs, 16 CPU cores, and 64 GB memory.

### Worker Health

Workers send heartbeats to the head node. Based on this:

| State | Meaning |
|:------|:--------|
| `ONLINE` | Heartbeat received recently — healthy |
| `SUSPECT` | No heartbeat for 30–90 seconds — might be down |
| `OFFLINE` | No heartbeat for 90+ seconds — assumed dead |

If a worker goes offline, any instances it was running enter `UNKNOWN` state. If the worker comes back, those instances may recover.

---

## Resources

PyLet tracks three resource types:

| Resource | Unit | CLI Flag | Python Param | Default |
|:---------|:-----|:---------|:-------------|:--------|
| GPU | count | `--gpu-units N` | `gpu=N` | 0 |
| CPU | cores | `--cpu-cores N` | `cpu=N` | 1 |
| Memory | MB | `--memory-mb N` | `memory=N` | 512 |

When you submit a job requesting 2 GPUs, the scheduler finds a worker with 2 free GPUs, reserves them, and assigns the job there.

### GPU Allocation

PyLet automatically sets `CUDA_VISIBLE_DEVICES` for your instance. If your job gets GPUs 2 and 3, PyLet sets `CUDA_VISIBLE_DEVICES=2,3` — your code doesn't need to worry about it.

---

## Service Discovery

Many workloads (like vLLM or SGLang) need a **port** to serve requests. PyLet handles this:

1. Each instance gets a `PORT` environment variable (range: 15600–15700)
2. Use `$PORT` in your command so the service binds to the right port
3. Look up the full endpoint with `pylet get-endpoint`

**Example:**

```bash
# Submit — note $PORT in the command
pylet submit 'vllm serve model --port $PORT' --gpu-units 1 --name my-vllm

# After it's running, get the endpoint
pylet get-endpoint --name my-vllm
# Output: 192.168.1.10:15600

# Now query it
curl http://192.168.1.10:15600/v1/models
```

In Python:

```python
instance = pylet.submit(
    "vllm serve model --port $PORT",
    gpu=1, name="my-vllm"
)
instance.wait_running()
print(f"Service at: {instance.endpoint}")
# Output: Service at: 192.168.1.10:15600
```

---

## Graceful Shutdown

When you cancel an instance:

1. PyLet sends `SIGTERM` to the process
2. Waits a grace period (default 30 seconds)
3. If still running, sends `SIGKILL`

This gives services time to shut down cleanly (finish in-flight requests, save checkpoints, etc.).

---

## Data Storage

All PyLet data lives in `~/.pylet/`:

| Path | What's There |
|:-----|:-------------|
| `~/.pylet/pylet.db` | SQLite database (all cluster state) |
| `~/.pylet/run/` | Worker process state files |
| `~/.pylet/logs/` | Instance log files |

::: info
The database survives head node restarts. No state is lost.
:::
