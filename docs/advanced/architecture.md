# Architecture

How PyLet works under the hood. Read this if you're curious — it's not required for using PyLet.

## System Design

```
┌──────────────┐     poke      ┌──────────────────┐
│  Controller  │──────────────>│    Scheduler     │
│  (FastAPI)   │               │   (in-process)   │
└──────┬───────┘               └────────┬─────────┘
       │                                │
       │         ┌──────────────┐       │
       └────────>│    SQLite    │<──────┘
                 │     (WAL)    │
                 └──────────────┘
                       ▲
                       │ heartbeat (long-poll)
       ┌───────────────┴───────────────┐
       │               │               │
  ┌────┴────┐    ┌────┴────┐    ┌────┴────┐
  │ Worker  │    │ Worker  │    │ Worker  │
  └─────────┘    └─────────┘    └─────────┘
```

**Head node**: Runs the controller (FastAPI) and scheduler. SQLite is the single source of truth.

**Workers**: Connect to head, receive desired state via heartbeat, reconcile local processes.

---

## The One Primitive: Instance

PyLet has exactly one concept: the **instance** — a process with resource allocation.

An instance has:
- A command to run
- Resource requirements (CPU, GPU, memory)
- A lifecycle (PENDING → ASSIGNED → RUNNING → COMPLETED/FAILED)
- An optional endpoint (host:port) for service discovery

That's it. No pods, replicas, services, deployments, or jobs. Higher-level abstractions are left to the application.

---

## Worker Reconciliation

Workers don't receive "start X" / "stop Y" commands. Instead, they receive **desired state** and reconcile:

```
Desired state (from head):  [instance_a@attempt=2, instance_b@attempt=1]
Actual state (local):       [instance_a@attempt=1, instance_c@attempt=1]

Reconcile:
  instance_a@attempt=1  → stale attempt → kill
  instance_b@attempt=1  → not running   → start
  instance_c@attempt=1  → not desired   → kill
```

This declarative model means:
- **Crash recovery is automatic**: worker restarts, gets desired state, reconciles
- **Network partitions are safe**: stale workers can't corrupt state (attempt fencing)
- **No command queue**: simpler than ack/retry protocols

---

## Instance Lifecycle

```
PENDING ──[assign]──> ASSIGNED ──[start]──> RUNNING ──[exit]──> COMPLETED
    │                    │                     │                    │
    │                    │                     │                 FAILED
    │                    │                     │
    │                    └─[worker offline]────┴──> UNKNOWN
    │                                                   │
    └──[cancel]──────────────────────────────────> CANCELLED
```

| State | Meaning |
|:------|:--------|
| PENDING | Waiting in queue |
| ASSIGNED | Worker selected, resources reserved |
| RUNNING | Process executing |
| UNKNOWN | Worker offline, outcome uncertain |
| COMPLETED | Exit code 0 |
| FAILED | Exit code ≠ 0 |
| CANCELLED | User cancelled |

### Cancellation Model

Cancellation uses a timestamp model (like Kubernetes `deletionTimestamp`):

1. User requests cancel → `cancellation_requested_at` is set
2. Instance excluded from desired state
3. Worker sees absence, sends SIGTERM
4. Grace period (default 30s)
5. SIGKILL if still running
6. Worker reports CANCELLED

---

## Heartbeat Protocol

Workers use **generation-based long-polling**:

1. Worker sends heartbeat with `last_seen_gen` and instance status reports
2. Controller processes reports (with attempt fencing)
3. Controller waits for state change or timeout (30s)
4. Returns new `gen` and `desired_instances`

**Cancel-and-reissue**: When local state changes (process starts/exits), the worker cancels the in-flight heartbeat and sends a new one immediately. This means the head gets updates within milliseconds.

---

## Attempt-Based Fencing

Each instance has an `attempt` counter that increments on each assignment:

```
Instance assigned to Worker A (attempt=1)
Network partition...
Instance reassigned to Worker B (attempt=2)
Worker A reconnects, reports for attempt=1
→ Controller ignores (stale attempt)
```

Only reports matching the current attempt can change state. This prevents stale workers from corrupting cluster state.

---

## Fine-Grained GPU Scheduling

These features exist because real research workloads need them:

- **Physical GPU indices** (`gpu_indices`): Request specific GPUs. Exposed via `CUDA_VISIBLE_DEVICES`.
- **GPU sharing** (`exclusive=False`): GPUs aren't reserved exclusively. Enables daemons to coexist with inference.
- **Worker placement** (`target_worker`): Target a specific worker (e.g., where a model is cached).

---

## Log Capture

Instance logs are captured using a **sidecar pattern**:

1. Worker wraps each command: `(cmd) 2>&1 | python3 -m pylet.log_sidecar`
2. Sidecar writes rotating log files in `~/.pylet/logs/`
3. Worker runs an HTTP server (port 15599) for log retrieval
4. Head proxies log requests to workers

The sidecar survives even if the instance crashes, so logs are never lost.

---

## Components

| File | Purpose |
|:-----|:--------|
| `controller.py` | Core scheduling and state management |
| `worker.py` | Process management and reconciliation |
| `schemas.py` | Pydantic models, state transitions |
| `db.py` | SQLite persistence layer |
| `server.py` | FastAPI HTTP endpoints |
| `client.py` | Async HTTP client |

---

## Design Decisions

| Decision | Choice | Why |
|:---------|:-------|:----|
| Database | SQLite (WAL mode) | Single file, no dependencies, survives restarts |
| Heartbeat | Long-poll | Instant updates, natural liveness check |
| State model | Declarative reconciliation | Automatic crash recovery, no command queue |
| Head topology | Single head | Simpler than consensus, good enough for ~100 nodes |
| GPU scheduling | Integer-based (not fractional) | Predictable, no oversubscription surprises |

---

## Limitations

| Limitation | Value | Workaround |
|:-----------|:------|:-----------|
| Port range per worker | 101 ports (15600–15700) | Deploy fewer services per worker |
| Log retention | 50 MB per instance | Use external log aggregation |
| SQLite scale | ~10K instances | Archive completed instances |
| Single head node | No redundancy | Run head on reliable hardware |
| No load balancing | N/A | Use nginx/HAProxy externally |
| No job dependencies | N/A | Handle in application logic |
| No authentication | N/A | Use network-level security |
