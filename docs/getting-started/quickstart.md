# Quick Start

Get PyLet running in under 5 minutes.

## Step 1: Install

```bash
pip install pylet
```

Or with [uv](https://docs.astral.sh/uv/):

```bash
uv add pylet
```

## Step 2: Start the Head Node

The **head node** is the brain of your cluster. It keeps track of workers, schedules jobs, and stores state.

Open a terminal and run:

```bash
pylet start
```

You should see:

```
Head node running on http://0.0.0.0:8000
```

::: tip
The head node stores everything in `~/.pylet/pylet.db` (SQLite). It survives restarts.
:::

## Step 3: Start a Worker

The **worker** is a machine (or process) that actually runs your jobs. Open a **second terminal**:

```bash
pylet start --head localhost:8000 --gpu-units 4
```

This tells the head: *"I'm a worker, I have 4 GPUs, give me jobs."*

::: info
Replace `localhost` with the head node's IP address if running on a different machine. Replace `4` with however many GPUs this machine has.
:::

## Step 4: Submit a Job

Open a **third terminal** and submit your first job:

```bash
pylet submit "nvidia-smi" --gpu-units 1 --name my-first-job
```

This says: *"Run `nvidia-smi`, give it 1 GPU, and call it `my-first-job`."*

## Step 5: Check Status

```bash
pylet get-instance --name my-first-job
```

## Step 6: View Logs

```bash
# Get the instance ID from get-instance output, then:
pylet logs <instance-id>
```

---

## A Real Example: Running vLLM

Let's deploy a real LLM inference server:

```bash
# Submit a vLLM server (note the $PORT — PyLet provides this automatically)
pylet submit 'vllm serve Qwen/Qwen2.5-1.5B-Instruct --port $PORT' \
    --gpu-units 1 --name my-vllm

# Wait for it to start, then get the endpoint
pylet get-endpoint --name my-vllm
# Output: 192.168.1.10:15600

# Now you can query it!
curl http://192.168.1.10:15600/v1/models
```

::: warning IMPORTANT
Use `$PORT` in your command — PyLet assigns a port to each instance and passes it via the `PORT` environment variable. This is how service discovery works.
:::

---

## Using the Python API

You can also do everything from Python:

```python
import pylet

# Connect to head node
pylet.init()  # defaults to localhost:8000

# Submit a job
instance = pylet.submit(
    "vllm serve Qwen/Qwen2.5-1.5B-Instruct --port $PORT",
    name="my-vllm",
    gpu=1,
    memory=4096,
)

# Wait for it to start
instance.wait_running()
print(f"Endpoint: {instance.endpoint}")

# Check logs
print(instance.logs())

# Cancel when done
instance.cancel()
instance.wait()  # wait for cancellation to finish
```

---

## Local Testing (No Real Cluster Needed)

Want to try PyLet without setting up multiple machines? Use `local_cluster`:

```python
import pylet

with pylet.local_cluster(workers=2, cpu_per_worker=2) as cluster:
    instance = pylet.submit("echo 'Hello from local cluster!'", cpu=1)
    instance.wait()
    print(instance.logs())
# Cluster auto-shuts down when exiting the with block
```

This starts a head + workers all in one process — perfect for testing.

---

## What's Next?

| Want to... | Read... |
|:-----------|:--------|
| Understand the mental model | [Core Concepts](/guide/concepts) |
| Use the Python API in detail | [Python API Reference](/reference/python-api) |
| See all CLI commands | [CLI Reference](/reference/cli) |
| Define jobs in config files | [Configuration](/guide/configuration) |
| See practical examples | [Examples](/guide/examples) |
