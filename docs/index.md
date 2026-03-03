---
layout: home

hero:
  name: PyLet
  text: Pythonic GPU Cluster Management
  tagline: Pure Python, no containers, no YAML — just pylet start and pylet submit.
  actions:
    - theme: brand
      text: Quick Start
      link: /getting-started/quickstart
    - theme: alt
      text: View on GitHub
      link: https://github.com/ServerlessLLM/pylet

features:
  - icon: 🚀
    title: Simple
    details: One pip install, ~5 commands to learn. No containers, no complex configs.
  - icon: 🎮
    title: GPU-Aware
    details: Automatic GPU allocation via CUDA_VISIBLE_DEVICES. Request by count or specific indices.
  - icon: 🔍
    title: Service Discovery
    details: Instances get a PORT env var. Look up endpoints with one command.
  - icon: 🐍
    title: Python API
    details: Full programmatic control alongside the CLI. Async API included.
  - icon: 📄
    title: Config Files
    details: Define jobs in TOML for reproducibility. CLI args override config values.
  - icon: 📋
    title: Real-Time Logs
    details: Stream logs from running instances. Never lose output — even on crash.
---

## Install

```bash
pip install pylet
```

## 30-Second Demo

```bash
# Terminal 1: Start the head node
pylet start

# Terminal 2: Start a worker with 4 GPUs
pylet start --head localhost:8000 --gpu-units 4

# Terminal 3: Run something!
pylet submit 'echo Hello from PyLet!' --name hello
```

That's it. You now have a working cluster.

## Why PyLet?

| Problem | PyLet's Answer |
|:--------|:---------------|
| "Who's using which GPU?" | Automatic GPU allocation via `CUDA_VISIBLE_DEVICES` |
| "How do I run my job on a remote machine?" | `pylet submit "python train.py" --gpu-units 2` |
| "How do I find my running service?" | `pylet get-endpoint --name my-service` |
| "I just want to run something, not learn K8s" | PyLet has ~5 commands to learn |

## Requirements

- Python 3.9+
- Linux (tested on Ubuntu)
