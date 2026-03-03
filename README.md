# PyLet Documentation

Documentation site for [PyLet](https://github.com/ServerlessLLM/pylet) — a simple distributed task execution system for GPU servers. Built with [VitePress](https://vitepress.dev/).

**Live site**: https://serverlessllm.github.io/pylet.github.io

## Local Development

```bash
# Install dependencies
npm install

# Start dev server with hot reload
npm run docs:dev
# Open http://localhost:5173

# Build for production
npm run docs:build

# Preview production build
npm run docs:preview
```

## Deployment

Auto-deploys to GitHub Pages on push to `main` via `.github/workflows/pages.yml`.

## Structure

```
docs/
├── index.md                      # Landing page
├── getting-started/
│   └── quickstart.md             # Step-by-step getting started
├── guide/
│   ├── concepts.md               # Instances, workers, resources
│   ├── configuration.md          # TOML config & env vars
│   └── examples.md               # Practical recipes
├── reference/
│   ├── cli.md                    # All pylet commands
│   └── python-api.md             # import pylet reference
└── advanced/
    ├── architecture.md           # How PyLet works internally
    └── troubleshooting.md        # Common issues & fixes
```