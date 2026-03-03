# Examples

Practical recipes for common tasks.

## Basic: Run a Command

```python
import pylet

pylet.init()

instance = pylet.submit("echo 'Hello from PyLet!'")
instance.wait()
print(instance.logs())
# Output: Hello from PyLet!
```

---

## GPU Training Job

```python
import pylet

pylet.init()

instance = pylet.submit(
    command="python train.py --model bert --epochs 10",
    gpu=2,
    cpu=8,
    memory=32768,
    name="bert-training"
)

instance.wait()

if instance.status == "COMPLETED":
    print("Training succeeded!")
else:
    print(f"Training failed (exit code: {instance.exit_code})")
    print(instance.logs())
```

---

## Deploy a vLLM Inference Service

```python
import pylet
import httpx

pylet.init()

# Deploy
instance = pylet.submit(
    command="vllm serve Qwen/Qwen2.5-1.5B-Instruct --port $PORT",
    gpu=1,
    memory=16384,
    name="my-vllm"
)

# Wait for it to start
instance.wait_running(timeout=300)
print(f"vLLM ready at: {instance.endpoint}")

# Send a request
response = httpx.post(
    f"http://{instance.endpoint}/v1/completions",
    json={
        "model": "Qwen/Qwen2.5-1.5B-Instruct",
        "prompt": "Hello",
        "max_tokens": 10
    },
    timeout=60
)
print(response.json())

# Clean up
instance.cancel()
instance.wait()
```

CLI equivalent:

```bash
pylet submit 'vllm serve Qwen/Qwen2.5-1.5B-Instruct --port $PORT' \
    --gpu-units 1 --memory-mb 16384 --name my-vllm

# Wait, then get endpoint
pylet get-endpoint --name my-vllm

# Query
curl http://<endpoint>/v1/models
```

---

## Deploy SGLang

```bash
pylet submit \
    'python -m sglang.launch_server --model meta-llama/Llama-3.1-8B-Instruct --port $PORT' \
    --gpu-units 1 --name sglang-test

pylet get-endpoint --name sglang-test
```

---

## Multi-GPU Tensor Parallelism

```python
import pylet

pylet.init()

instance = pylet.submit(
    command="vllm serve meta-llama/Llama-3.1-70B --port $PORT --tensor-parallel-size 4",
    gpu=4,
    memory=131072,  # 128 GB
    name="llama-70b"
)

instance.wait_running(timeout=600)
print(f"70B model at: {instance.endpoint}")
```

---

## Request Specific GPUs

```python
import pylet

pylet.init()

# Use GPU 0 and GPU 2 specifically (not just "any 2 GPUs")
instance = pylet.submit(
    command="python train.py",
    gpu_indices=[0, 2],
    name="specific-gpu-job"
)
instance.wait()
```

---

## GPU Sharing (Non-Exclusive)

Some daemons (like storage servers) need to see all GPUs but shouldn't block other jobs from using them:

```python
import pylet

pylet.init()

# Storage daemon: sees all 4 GPUs, but doesn't block them
storage = pylet.submit(
    command="sllm-store start --port $PORT",
    gpu_indices=[0, 1, 2, 3],
    exclusive=False,       # Key: don't reserve GPUs
    target_worker="storage-node",
    name="storage-daemon"
)
storage.wait_running()

# Inference job: can still use GPU 0 because storage is non-exclusive
inference = pylet.submit(
    command="python inference.py --port $PORT",
    gpu_indices=[0],
    name="inference"
)
inference.wait_running()
```

---

## Use a Virtual Environment

```python
import pylet

pylet.init()

instance = pylet.submit(
    command="python -c 'import torch; print(torch.__version__)'",
    venv="/shared/venvs/torch-2.0",
    name="torch-version"
)
instance.wait()
print(instance.logs())
```

---

## Batch Hyperparameter Search

```python
import pylet

pylet.init()

configs = [
    {"lr": 0.001, "batch": 32},
    {"lr": 0.0001, "batch": 64},
    {"lr": 0.00001, "batch": 128},
]

# Submit all jobs
instances = []
for i, cfg in enumerate(configs):
    inst = pylet.submit(
        f"python train.py --lr {cfg['lr']} --batch {cfg['batch']}",
        gpu=1,
        name=f"hparam-{i}",
        labels={"lr": str(cfg["lr"]), "batch": str(cfg["batch"])}
    )
    instances.append(inst)

# Wait for all to finish
for inst in instances:
    inst.wait()
    print(f"{inst.name}: {inst.status}")
```

---

## Using TOML Config Files

**File: `job.toml`**

```toml
name = "config-job"
command = "python train.py"

[resources]
gpus = 2
memory = "16Gi"

[env]
HF_TOKEN = "${HF_TOKEN}"
```

```bash
# Use config
pylet submit --config job.toml

# Override GPU count from CLI
pylet submit --config job.toml --gpu-units 4
```

---

## Monitor a Running Job

```python
import pylet
import time

pylet.init()

instance = pylet.submit("python long_training.py", gpu=1, name="monitor-demo")
instance.wait_running()

# Poll status and logs periodically
while instance.status == "RUNNING":
    instance.refresh()
    print(f"Status: {instance.status}")
    print(f"Recent logs:\n{instance.logs(tail=500)}")
    print("---")
    time.sleep(30)

print(f"Done! Status: {instance.status}, exit code: {instance.exit_code}")
```

---

## Error Handling

```python
import pylet
from pylet import TimeoutError, InstanceFailedError, NotFoundError

pylet.init()

# Handle timeout
try:
    instance = pylet.submit("python long_job.py", gpu=1)
    instance.wait(timeout=60)
except TimeoutError:
    print("Timed out, cancelling...")
    instance.cancel()
    instance.wait()

# Handle failure
try:
    instance = pylet.submit("python might_fail.py", gpu=1)
    instance.wait()
except InstanceFailedError as e:
    print(f"Failed with exit code: {e.instance.exit_code}")
    print(e.instance.logs())

# Handle not found
try:
    inst = pylet.get(name="nonexistent")
except NotFoundError:
    print("Instance not found")
```

---

## Async API

```python
import asyncio
import pylet.aio as pylet

async def main():
    await pylet.init()

    # Submit multiple concurrently
    instances = await asyncio.gather(
        pylet.submit("python task1.py", gpu=1),
        pylet.submit("python task2.py", gpu=1),
        pylet.submit("python task3.py", gpu=1),
    )

    # Wait for all concurrently
    await asyncio.gather(*[inst.wait() for inst in instances])

    for inst in instances:
        print(f"{inst.name}: {inst.status}")

asyncio.run(main())
```

---

## Local Testing Cluster

No GPU server? No problem. Test locally:

```python
import pylet

with pylet.local_cluster(workers=2, cpu_per_worker=2) as cluster:
    i1 = pylet.submit("sleep 5 && echo done", cpu=1, name="job-1")
    i2 = pylet.submit("sleep 5 && echo done", cpu=1, name="job-2")

    i1.wait()
    i2.wait()

    print(i1.logs())  # "done"
    print(i2.logs())  # "done"
# Cluster auto-cleaned up
```

---

## Deploy Multiple Replicas

PyLet doesn't have built-in load balancing, but you can deploy multiple instances and use an external LB:

```python
import pylet

pylet.init()

# Deploy 3 vLLM instances
endpoints = []
for i in range(3):
    inst = pylet.submit(
        "vllm serve model --port $PORT",
        gpu=1, name=f"vllm-{i}"
    )
    inst.wait_running()
    endpoints.append(inst.endpoint)

print(f"Configure your load balancer with: {endpoints}")
# e.g., nginx upstream with least_conn
```

Simple application-level round-robin:

```python
class RoundRobin:
    def __init__(self, endpoints):
        self.endpoints = endpoints
        self.index = 0

    def next(self):
        ep = self.endpoints[self.index]
        self.index = (self.index + 1) % len(self.endpoints)
        return ep

balancer = RoundRobin(endpoints)
endpoint = balancer.next()  # Use this for each request
```
