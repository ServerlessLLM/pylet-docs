# CLI Reference

All PyLet command-line commands.

## Cluster Management

### `pylet start`

Start the head node or a worker node.

```bash
# Start head node (server)
pylet start

# Start head node on custom port
pylet start --port 9000

# Start worker node
pylet start --head 192.168.1.10:8000 --gpu-units 4

# Start worker with full resource spec
pylet start --head 192.168.1.10:8000 \
    --gpu-units 4 --cpu-cores 16 --memory-mb 65536
```

| Option | Default | Description |
|:-------|:--------|:------------|
| `--head <ip:port>` | *(none)* | Head node address. If omitted, starts as **head**. |
| `--port <int>` | 8000 (head) / 15599 (worker) | Port to run on |
| `--gpu-units <int>` | 0 | GPU units to offer (worker only) |
| `--cpu-cores <int>` | 4 | CPU cores to offer (worker only) |
| `--memory-mb <int>` | 4096 | Memory in MB to offer (worker only) |

---

## Instance Management

### `pylet submit`

Submit a new instance to the cluster.

```bash
# Simple command
pylet submit echo hello

# With resources
pylet submit python train.py --gpu-units 1 --cpu-cores 4

# Named instance (for service discovery)
pylet submit "vllm serve model --port \$PORT" --name my-vllm --gpu-units 1

# From a config file
pylet submit --config job.toml

# With environment variables and labels
pylet submit "python train.py" \
    --env HF_TOKEN=xxx --label project=llama --gpu-units 2

# Target specific worker and GPUs
pylet submit "python train.py" \
    --target-worker gpu-0 --gpu-indices 0,1

# Use a virtual environment
pylet submit "python train.py" --venv /home/user/my-venv --gpu-units 1
```

| Option | Default | Description |
|:-------|:--------|:------------|
| `COMMAND` | *(required)* | Shell command to execute |
| `--config`, `-c` | *(none)* | TOML config file path |
| `--name <str>` | *(none)* | Instance name (for service discovery / lookup) |
| `--gpu-units <int>` | 0 | GPU units required |
| `--cpu-cores <int>` | 1 | CPU cores required |
| `--memory-mb <int>` | 512 | Memory in MB required |
| `--target-worker <str>` | *(none)* | Pin to a specific worker |
| `--gpu-indices <int,...>` | *(none)* | Request specific GPU indices |
| `--exclusive / --no-exclusive` | `--exclusive` | Whether GPUs are exclusively reserved |
| `--label <key=value>` | *(none)* | Add a label (repeatable) |
| `--env <key=value>` | *(none)* | Set an environment variable (repeatable) |
| `--venv <path>` | *(none)* | Path to a pre-existing virtualenv |

::: tip
When using `--config`, CLI arguments take precedence over config file values.
:::

---

### `pylet get-instance`

Get instance details.

```bash
pylet get-instance --name my-vllm
pylet get-instance --instance-id abc-123-def
```

| Option | Description |
|:-------|:------------|
| `--name <str>` | Lookup by name |
| `--instance-id <str>` | Lookup by UUID |

---

### `pylet get-endpoint`

Get the `host:port` of a running instance.

```bash
pylet get-endpoint --name my-vllm
# Output: 192.168.1.5:15600
```

| Option | Description |
|:-------|:------------|
| `--name <str>` | Lookup by name |
| `--instance-id <str>` | Lookup by UUID |

---

### `pylet logs`

View instance logs.

```bash
# Full logs
pylet logs <instance-id>

# Last 1000 bytes
pylet logs <instance-id> --tail 1000

# Follow in real-time (like tail -f)
pylet logs <instance-id> --follow
```

| Option | Default | Description |
|:-------|:--------|:------------|
| `--tail <int>` | *(all)* | Return only last N bytes |
| `--follow`, `-f` | false | Follow log output in real-time |

---

### `pylet cancel`

Cancel a running instance. Sends SIGTERM, waits grace period, then SIGKILL.

```bash
pylet cancel <instance-id>
```

---

### `pylet get-result`

Get the result of a completed instance.

```bash
pylet get-result <instance-id>
```

---

### `pylet delete`

Delete instance(s). **Permanent and irreversible.**

```bash
# Delete by name
pylet delete --name my-instance

# Delete by ID
pylet delete --instance-id abc-123-def

# Delete all completed instances
pylet delete --all --status COMPLETED --yes

# Delete ALL instances (dangerous!)
pylet delete --all --yes
```

| Option | Description |
|:-------|:------------|
| `--instance-id <str>` | Delete by UUID |
| `--name <str>` | Delete by name |
| `--all` | Delete all instances |
| `--status <str>` | Filter by status (`COMPLETED`, `FAILED`, `CANCELLED`) — only with `--all` |
| `--yes`, `-y` | Skip confirmation prompt |

::: danger
Running instances should be cancelled before deleting. `pylet delete` does not kill processes.
:::

**Safe cleanup pattern:**

```bash
pylet delete --all --status COMPLETED --yes
pylet delete --all --status FAILED --yes
pylet delete --all --status CANCELLED --yes
```

---

## Worker Management

### `pylet list-workers`

List all registered workers.

```bash
pylet list-workers
```

Output:

```
Worker abc-123 (192.168.1.5) - ONLINE - GPUs: 4
Worker def-456 (192.168.1.6) - ONLINE - GPUs: 2
```

---

### `pylet delete-worker`

Delete offline workers. Only `OFFLINE` workers can be deleted.

```bash
# Delete a specific worker
pylet delete-worker --worker-id worker-123 --yes

# Delete all offline workers
pylet delete-worker --all-offline --yes
```

| Option | Description |
|:-------|:------------|
| `--worker-id <str>` | Delete by worker ID |
| `--all-offline` | Delete all OFFLINE workers |
| `--yes`, `-y` | Skip confirmation |

---

## Command Summary

| Command | Purpose |
|:--------|:--------|
| `pylet start` | Start head or worker node |
| `pylet submit <cmd>` | Submit an instance |
| `pylet get-instance` | Get instance details |
| `pylet get-endpoint` | Get instance endpoint (host:port) |
| `pylet get-result <id>` | Get instance result |
| `pylet logs <id>` | View instance logs |
| `pylet cancel <id>` | Cancel an instance |
| `pylet delete` | Delete instance(s) |
| `pylet list-workers` | List workers |
| `pylet delete-worker` | Delete offline worker(s) |
