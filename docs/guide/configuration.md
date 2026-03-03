# Configuration

TOML config files and environment variables.

## TOML Config Files

Instead of passing everything on the command line, you can define jobs in TOML files:

```bash
pylet submit --config job.toml
```

### Basic Format

```toml
# job.toml
name = "my-job"
command = "python train.py"

[resources]
gpus = 1
cpus = 4
memory = "16Gi"

[env]
HF_TOKEN = "${HF_TOKEN}"

[labels]
type = "training"
```

### Fields

| Field | Required | Description |
|:------|:---------|:------------|
| `command` | Yes | Shell command (string or array) |
| `name` | No | Instance name (defaults to filename) |
| `[resources].gpus` | No | GPU count |
| `[resources].cpus` | No | CPU cores |
| `[resources].memory` | No | Memory with units (see below) |
| `[resources].gpu_indices` | No | Specific GPU indices |
| `[resources].exclusive` | No | GPU exclusivity (default: true) |
| `[resources].target_worker` | No | Pin to worker |
| `[env].*` | No | Environment variables |
| `[labels].*` | No | Custom metadata |

### Memory Units

| Format | Meaning | Example |
|:-------|:--------|:--------|
| `"16Gi"` or `"16G"` | 16 GiB = 16384 MB | Large training jobs |
| `"512Mi"` or `"512M"` | 512 MB | Small tasks |
| `"1Ti"` or `"1T"` | 1 TiB = 1048576 MB | Huge jobs |
| `"8192"` | 8192 MB (plain number) | Explicit MB |

### Environment Variable Interpolation

Config files can reference shell environment variables:

```toml
[env]
TOKEN = "${HF_TOKEN}"       # Full variable
TOKEN = "$HF_TOKEN"          # Also works
PATH = "/data/${USER}/out"   # Partial
STATIC = "fixed_value"       # Static value
```

### Precedence

When the same setting is in multiple places:

```
CLI arguments  >  Config file  >  Defaults
```

Example: `pylet submit --config job.toml --gpu-units 0` overrides whatever `gpus` is in the config.

---

## Example Config Files

### Minimal

```toml
command = "echo hello"
```

### Training Job

```toml
name = "llama-finetune"
command = ["python", "train.py", "--model", "meta-llama/Llama-2-7b", "--epochs", "10"]

[resources]
gpus = 2
cpus = 8
memory = "32Gi"

[env]
WANDB_API_KEY = "${WANDB_API_KEY}"

[labels]
type = "training"
experiment = "llama-finetune-v1"
```

### Inference Service

```toml
name = "vllm-inference"
command = ["vllm", "serve", "Qwen/Qwen2.5-1.5B-Instruct", "--port", "$PORT", "--host", "0.0.0.0"]

[resources]
gpus = 1
cpus = 4
memory = "16Gi"

[env]
HF_TOKEN = "${HF_TOKEN}"

[labels]
type = "inference"
model = "qwen-2.5"
```

### Non-Exclusive GPU Sharing

```toml
name = "sllm-store"
command = "sllm-store start --port $PORT"

[resources]
gpu_indices = [0, 1, 2, 3]
exclusive = false
target_worker = "storage-node"

[labels]
type = "storage"
```

---

## Environment Variables

These environment variables configure PyLet's behavior.

### Paths

| Variable | Default | Description |
|:---------|:--------|:------------|
| `PYLET_DATA_DIR` | `~/.pylet` | Base data directory |
| `PYLET_DB_PATH` | `$DATA_DIR/pylet.db` | SQLite database path |
| `PYLET_RUN_DIR` | `$DATA_DIR/run` | Worker process state |
| `PYLET_LOG_DIR` | `$DATA_DIR/logs` | Instance log files |

### Worker Settings

| Variable | Default | Description |
|:---------|:--------|:------------|
| `PYLET_WORKER_PORT_MIN` | `15600` | Instance port range start |
| `PYLET_WORKER_PORT_MAX` | `15700` | Instance port range end |
| `PYLET_WORKER_HTTP_PORT` | `15599` | Worker HTTP server port |

### Controller Settings

| Variable | Default | Description |
|:---------|:--------|:------------|
| `PYLET_SUSPECT_THRESHOLD_SECONDS` | `30` | Seconds before worker → SUSPECT |
| `PYLET_OFFLINE_THRESHOLD_SECONDS` | `90` | Seconds before worker → OFFLINE |
| `PYLET_LIVENESS_CHECK_INTERVAL` | `5` | Health check frequency (seconds) |
| `PYLET_SCHEDULER_INTERVAL` | `2` | Scheduling loop frequency (seconds) |
| `PYLET_HEARTBEAT_POLL_TIMEOUT` | `30.0` | Heartbeat timeout (seconds) |

### Graceful Shutdown

| Variable | Default | Description |
|:---------|:--------|:------------|
| `PYLET_DEFAULT_GRACE_PERIOD_SECONDS` | `30` | SIGTERM → SIGKILL grace period |
| `PYLET_MAX_GRACE_PERIOD_SECONDS` | `300` | Maximum grace period |

### Log Settings

| Variable | Default | Description |
|:---------|:--------|:------------|
| `PYLET_LOG_CHUNK_SIZE` | `10485760` | Log file size (10 MB) |
| `PYLET_LOG_MAX_FILES` | `5` | Max log file count |
| `PYLET_LOG_MAX_RESPONSE_SIZE` | `10485760` | Max log response size |

---

## Instance Environment Variables

These are set **inside** your running instance automatically:

| Variable | Description |
|:---------|:------------|
| `PORT` | Allocated port (15600–15700). Use `--port $PORT` in your command. |
| `CUDA_VISIBLE_DEVICES` | Allocated GPU indices (e.g., `0,2`). Set automatically. |
