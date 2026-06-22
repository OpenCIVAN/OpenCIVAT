# OpenCIVAN

**Open Collaborative Immersive Visualization and Analytics Network**

OpenCIVAN is an open-source platform for real-time, multi-user scientific data visualization in 3D and immersive (VR) environments. It targets research teams who need to explore large datasets together — from the same desk or across the globe — in a browser-native, headset-ready interface.

---

## Navigation

| | |
|---|---|
| [Features](#features) | [Quick Start](#quick-start) |
| [Documentation](docs/README.md) | [Architecture](docs/architecture.md) |
| [Contributing](CONTRIBUTING.md) | [Roadmap](ROADMAP.md) |
| [Code of Conduct](CODE_OF_CONDUCT.md) | [License](#license) |

---

## Features

| Category | Capability |
|---|---|
| **Visualization** | 3D volume rendering, isosurfaces, slicing (MPR), scalar coloring, glyphs, clipping, thresholding, time series — powered by VTK.js |
| **Immersive / VR** | WebXR support (Quest 2 / Quest 3 browser); controller and hand tracking; VR wrist menu; fly and teleport navigation |
| **Collaboration** | Synchronous multi-user sessions; shared cursor and camera presence via Y.js; voice communication via LiveKit |
| **Data workflow** | Upload VTK/VTP datasets; server-side compute jobs (Python VTK worker); thumbnail generation |
| **Architecture** | Server-authoritative state (REST + WebSocket); Y.js presence layer; React 18 frontend; Docker-based backend |

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, VTK.js ≥ 34, Webpack 5, SCSS |
| Visualization | [@kitware/vtk.js](https://kitware.github.io/vtk-js/) |
| VR / XR | WebXR Device API, [React Three XR](https://github.com/pmndrs/react-xr) |
| Collaboration | [Y.js](https://yjs.dev/) (presence), [y-websocket](https://github.com/yjs/y-websocket) |
| Voice | [LiveKit](https://livekit.io/) WebRTC |
| Backend | Node.js, Express 4 |
| Database | PostgreSQL 15 |
| Object storage | MinIO |
| Job queue | BullMQ + Redis 7 |
| Compute worker | Python 3 + VTK |
| Auth | Keycloak (OIDC) or dev-bypass mode |

---

## Quick Start

> **Prerequisites:** Docker Desktop, Node.js ≥ 18, Git.  
> For full setup details see **[docs/installation.md](docs/installation.md)**.

```bash
# 1. Clone
git clone https://github.com/<your-org>/opencivan.git
cd opencivan

# 2. Configure environment
cp .env.example .env          # edit as needed

# 3. Start backend services (PostgreSQL, MinIO, Redis, API, Y.js, workers)
./scripts/start.sh

# 4. Install frontend dependencies
npm install

# 5. Start frontend dev server (HTTPS, port 8081)
npm start
# → open https://localhost:8081  (accept the self-signed certificate)
```

To skip Keycloak during development, set `DEV_BYPASS_AUTH=true` in `.env`.

---

## Documentation

| Document | Description |
|---|---|
| [docs/installation.md](docs/installation.md) | Full installation and configuration guide |
| [docs/architecture.md](docs/architecture.md) | System architecture and design decisions |
| [docs/tutorials.md](docs/tutorials.md) | Step-by-step tutorials for new users |
| [docs/examples.md](docs/examples.md) | Example datasets and use cases |
| [DEVELOPMENT_GUIDE.md](DEVELOPMENT_GUIDE.md) | Developer reference (imports, services, patterns) |

---

## Contributing

We welcome contributions of all kinds — bug reports, documentation improvements, new VTK features, VR interaction research, and more.

- Read **[CONTRIBUTING.md](CONTRIBUTING.md)** for the workflow
- Browse [open issues](../../issues) for tasks labeled `good first issue` or `help wanted`
- Join the conversation in [GitHub Discussions](../../discussions)

---

## Community

| Channel | Purpose |
|---|---|
| [GitHub Issues](../../issues) | Bug reports and feature requests |
| [GitHub Discussions](../../discussions) | Q&A, announcements, research showcases |
| [GitHub Projects](../../projects) | Roadmap and sprint tracking |

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
