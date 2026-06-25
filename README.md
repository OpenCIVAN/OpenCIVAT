# OpenCIVAN

**Open Collaborative Immersive Visualization and Analytics**

OpenCIVAN is an open-source research toolkit for real-time, multi-user 3D scientific visualization. It is designed for research teams who need to explore large volumetric and surface datasets together — from the same machine or across a network — in a browser-native, headset-capable interface.

The toolkit is **not** production-ready software. It is an initial open-source base for collaborative immersive visualization and analytics of high-dimensional scientific data that research groups can build on.

---

## Navigation

| | |
|---|---|
| [Quick Start](#quick-start) | [Run Instructions](docs/getting-started.md) |
| [Documentation](#documentation) | [Architecture](docs/architecture.md) |
| [Windows + GPU Setup](docs/windows-gpu-setup.md) | [Apple Vision Pro](docs/apple-vision-pro.md) |
| [Contributing](CONTRIBUTING.md) | [License](#license) |

---

## Features

| Category | Capability |
|---|---|
| **Visualization** | 3D surface rendering, volume rendering, isosurfaces, slicing (MPR), scalar coloring, glyphs, clipping, thresholding, time series — powered by VTK.js and server-side Python VTK |
| **Immersive / XR** | WebXR support; works in Apple Vision Pro browser, desktop WebXR browsers, and standard browsers without XR hardware |
| **Collaboration** | Synchronous multi-user sessions; shared cursor and camera presence via Y.js; voice communication via LiveKit |
| **Data workflow** | Server-side VTK rendering (`.vtp`, `.vtu`, `.vti`); built-in sample datasets; browser VTK.js fallback |
| **Architecture** | Python VTK render server (server-side rendering); Node.js API; React 18 frontend; Docker-based backend |

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, VTK.js ≥ 34, Webpack 5, SCSS |
| Visualization | [@kitware/vtk.js](https://kitware.github.io/vtk-js/) + Python VTK server |
| XR | WebXR Device API |
| Collaboration | [Y.js](https://yjs.dev/) (presence), [y-websocket](https://github.com/yjs/y-websocket) |
| Voice | [LiveKit](https://livekit.io/) WebRTC |
| Render server | Python 3.11, VTK 9.3+, FastAPI, uvicorn |
| Backend API | Node.js 18+, Express 4 |
| Database | PostgreSQL 15 |
| Object storage | MinIO |
| Job queue | BullMQ + Redis 7 |
| Auth | Keycloak (OIDC) or dev-bypass mode |

---

## Platform Targets

| Role | Platform |
|------|----------|
| Dev machine + render server | Windows + NVIDIA GPU (GPU-accelerated Docker rendering) |
| Primary client | Apple Vision Pro browser (thin client, receives rendered frames) |
| Secondary client | Desktop browser — Chrome, Firefox, Edge, Safari |
| macOS dev | macOS — CPU/Mesa rendering only, frontend and API work |

---

## Quick Start

### Prerequisites

- Node.js ≥ 18
- npm ≥ 9 (bundled with Node.js)
- Python 3.11+ (for local render server)
- Docker Desktop (for full stack or GPU rendering)

### Path A — Frontend only (no backend needed)

Built-in sample datasets (Bones, Lungs, Skull, etc.) load directly in the browser without any backend.

```bash
git clone https://github.com/<your-org>/opencivan.git
cd opencivan
npm install
cp .env.example .env
npm run start:http
```

Open **http://localhost:8081** — the main workspace appears with built-in datasets in the left panel.

### Path B — Frontend + render server (two terminals)

For server-side VTK rendering without running the full Docker stack.

**Terminal 1 — render server:**
```bash
cd server/render_server
python -m venv .venv
source .venv/bin/activate        # Windows PowerShell: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
DATASET_DIR=../../public/vtp_files uvicorn app:app --host 0.0.0.0 --port 7001 --reload
```

**Terminal 2 — frontend:**
```bash
# In repo root, with RENDER_MODE=server in .env
npm run start:http
```

Open **http://localhost:8081** — datasets render through the Python VTK server.

Verify render server: `curl http://localhost:7001/health`

### Path C — Full Docker stack (CPU)

Runs all backend services: PostgreSQL, MinIO, Redis, API, Y.js, VTK render server.

```bash
cp .env.example .env
docker-compose up --build
npm install
npm run start:http
```

### Path D — Full Docker stack (Windows + NVIDIA GPU)

```bash
cp .env.example .env
# Set ENABLE_GPU_RENDERING=true in .env
docker-compose -f docker-compose.yml -f docker-compose.gpu.yml up --build
npm install
npm run start:http
```

Test GPU access first:
```bash
docker run --rm --gpus all nvidia/cuda:12.4.1-base-ubuntu22.04 nvidia-smi
```

See **[docs/windows-gpu-setup.md](docs/windows-gpu-setup.md)** for full setup.

---

## Sample Datasets

Built-in datasets live in `public/vtp_files/` and load in the browser without any backend:

| File | Type | Size |
|------|------|------|
| Bones.vtp | Surface mesh | 26 MB |
| LungVessels.vtp | Surface mesh | 27 MB |
| Lungs.vtp | Surface mesh | 10 MB |
| Skull.vtp | Surface mesh | 19 MB |
| Ventricles.vtp | Surface mesh | 16 MB |
| diskout.vtp | Polydata sample | — |
| earth.vtp | Surface mesh | — |

To add datasets: copy `.vtp`, `.vtu`, or `.vti` files to `public/vtp_files/` and add an entry to `public/vtp_files/manifest.json`.

For server-side datasets: copy files to `server/datasets/` (auto-scanned by render server).

---

## Documentation

| Document | Description |
|---|---|
| [docs/getting-started.md](docs/getting-started.md) | Step-by-step run instructions for all workflows |
| [docs/windows-gpu-setup.md](docs/windows-gpu-setup.md) | Windows + NVIDIA + WSL2 + Docker GPU setup |
| [docs/apple-vision-pro.md](docs/apple-vision-pro.md) | Apple Vision Pro browser client guide |
| [docs/server-rendering.md](docs/server-rendering.md) | Server-side rendering architecture and protocol |
| [docs/architecture.md](docs/architecture.md) | System architecture and design decisions |
| [docs/installation.md](docs/installation.md) | Full installation and configuration reference |
| [docs/tutorials.md](docs/tutorials.md) | Step-by-step tutorials for new users |

---

## Contributing

We welcome contributions — bug reports, documentation improvements, new VTK features, XR interaction research.

- Read **[CONTRIBUTING.md](CONTRIBUTING.md)** for the workflow
- Browse [open issues](../../issues) for tasks labeled `good first issue` or `help wanted`
- Join the conversation in [GitHub Discussions](../../discussions)

---

## Citation

If you use OpenCIVAN in academic work, please cite:

```
TBD — citation information will be added after first stable release.
```

---

## License

OpenCIVAN is released under the **MIT License**.
See [LICENSE](LICENSE) for the full text.

Copyright (c) 2026 OpenCIVAN Contributors.
