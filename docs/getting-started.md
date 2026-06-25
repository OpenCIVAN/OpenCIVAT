# Getting Started

Step-by-step run instructions for every workflow. A new developer should be able to clone the repo and run the toolkit without guessing.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Quick start — frontend only](#2-quick-start--frontend-only)
3. [Quick start — render server](#3-quick-start--render-server)
4. [Quick start — full toolkit locally](#4-quick-start--full-toolkit-locally)
5. [Docker workflow](#5-docker-workflow)
6. [Docker GPU workflow (Windows/NVIDIA)](#6-docker-gpu-workflow-windowsnvidia)
7. [Environment variables](#7-environment-variables)
8. [Dataset instructions](#8-dataset-instructions)
9. [Collaboration and session testing](#9-collaboration-and-session-testing)
10. [Apple Vision Pro](#10-apple-vision-pro)
11. [Troubleshooting](#11-troubleshooting)
12. [Verification checklist](#12-verification-checklist)

---

## 1. Prerequisites

| Tool | Version | Required for |
|------|---------|-------------|
| Node.js | ≥ 18 | Frontend, API server |
| npm | ≥ 9 | Bundled with Node.js |
| Python | 3.11+ | Local render server |
| Docker Desktop | ≥ 24 | Full Docker stack |
| Docker Compose | v2+ | Bundled with Docker Desktop |
| WSL2 (Windows) | — | NVIDIA GPU Docker workflow |
| NVIDIA driver (Windows) | ≥ 471.11 | GPU mode |
| Modern browser | — | Chrome, Firefox, Edge, Safari all work |
| ngrok or Cloudflare Tunnel | — | For headset / remote browser testing |

Python is only required if you run the render server locally (Path B and C below). For full Docker workflows (Path D and E), Python is handled inside the container.

---

## 2. Quick Start — Frontend Only

No backend required. Built-in sample datasets (Bones, Lungs, Skull, etc.) load directly in the browser using the bundled VTK.js renderer.

```bash
git clone https://github.com/<your-org>/opencivan.git
cd opencivan
npm install
cp .env.example .env
npm run start:http
```

Open: **http://localhost:8081**

Expected result:
- Main workspace appears
- Left panel shows **Sample Datasets** (Bones, Lung Vessels, Lungs, Skull, Ventricles, etc.)
- Click a dataset → 3D mesh loads in the viewport
- No server connection required

> `npm run start:http` uses HTTP (port 8081). Use `npm start` for HTTPS — it requires SSL certificates at `certs/key.pem` and `certs/cert.pem`. For most local testing, HTTP is simpler.

---

## 3. Quick Start — Render Server

Runs the Python VTK render server locally so the browser sends camera commands and receives rendered PNG frames rather than parsing VTK files itself.

**Terminal 1 — render server:**

macOS / Linux:
```bash
cd server/render_server
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
DATASET_DIR=../../public/vtp_files uvicorn app:app --host 0.0.0.0 --port 7001 --reload
```

Windows PowerShell:
```powershell
cd server\render_server
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
$env:DATASET_DIR="..\..\public\vtp_files"
uvicorn app:app --host 0.0.0.0 --port 7001 --reload
```

Expected output:
```
[app] Starting CIA_Web VTK Render Server
[app] Dataset dir: ../../public/vtp_files
[app] VTK version: 9.x.y
[app] Registered 7 dataset(s)
INFO:     Uvicorn running on http://0.0.0.0:7001
```

Verify:
```bash
curl http://localhost:7001/health
# {"ok":true,"vtk_available":true,"vtk_version":"9.x.y","dataset_count":7,...}

curl http://localhost:7001/datasets
# [{"id":"bones","name":"Bones",...}, ...]
```

**Terminal 2 — frontend:**

In `.env`, set:
```
RENDER_MODE=server
```

Then:
```bash
npm run start:http
```

Open: **http://localhost:8081**

Expected result:
- Left panel shows **Server Datasets** section listing VTP files
- Clicking a dataset sends a render request to the Python server
- Rendered PNG frames appear in the viewport
- No large VTK file is parsed in the browser

---

## 4. Quick Start — Full Toolkit Locally

Runs frontend + render server + Node.js API (no Docker). Suitable for development without Docker overhead.

Three terminals:

**Terminal 1 — render server (Python):**
```bash
cd server/render_server
source .venv/bin/activate
DATASET_DIR=../../public/vtp_files uvicorn app:app --host 0.0.0.0 --port 7001 --reload
```

**Terminal 2 — Node.js API + Y.js WebSocket:**
```bash
npm run dev
# Runs: webpack dev server (8081) + nodemon API (3001) + Y.js WebSocket (9001)
```

Or run frontend and API separately:
```bash
# Terminal 2a — Node.js API
npm run server:dev

# Terminal 2b — Y.js WebSocket
node server.js

# Terminal 2c — Frontend
npm run start:http
```

Open: **http://localhost:8081**

Expected behavior:
- Frontend connects to Node.js API at port 3001
- Dataset list loads from both built-in public files and API-managed uploads
- Session/collaboration tools are available
- Selecting a VTP/VTU/VTI dataset renders through the Python server (if `RENDER_MODE=server`)
- Two-tab collaboration works (see Section 9)

Service endpoints:
```
http://localhost:8081          — Frontend
http://localhost:3001/api/health   — Node.js API health
http://localhost:3001/api/gpu/status — GPU status
ws://localhost:9001            — Y.js WebSocket
http://localhost:7001/health   — Render server health
http://localhost:7001/datasets — Dataset list
```

---

## 5. Docker Workflow

Runs all backend services in Docker: PostgreSQL, MinIO, Redis, Keycloak, Node.js API, Y.js, VTK render server, thumbnail worker.

```bash
cp .env.example .env
# Review .env — defaults work for local dev
docker-compose up --build
```

Or using npm scripts:
```bash
npm run docker:up:build   # build + start
npm run docker:up         # start without rebuild
```

In a separate terminal, start the frontend:
```bash
npm install
npm run start:http
```

Open: **http://localhost:8081**

To rebuild only the API container after backend code changes:
```bash
./scripts/rebuild-api.sh
```

To stop:
```bash
docker-compose down         # keep volumes
docker-compose down -v      # wipe volumes (database, MinIO data)
```

---

## 6. Docker GPU Workflow (Windows/NVIDIA)

Adds NVIDIA GPU passthrough to the render server and VTK worker containers. Only works on Windows with NVIDIA GPU + WSL2 + Docker Desktop.

**First, verify GPU Docker access:**
```bash
docker run --rm --gpus all nvidia/cuda:12.4.1-base-ubuntu22.04 nvidia-smi
```

If that shows your GPU, proceed:

```bash
cp .env.example .env
# Set in .env:
#   ENABLE_GPU_RENDERING=true
#   RENDER_MODE=server

docker-compose -f docker-compose.yml -f docker-compose.gpu.yml up --build
```

In a separate terminal:
```bash
npm install
npm run start:http
```

Verify GPU is available:
```bash
curl http://localhost:3001/api/gpu/status
# {"gpuAvailable":true,"nvidiaSmiAvailable":true,"renderingBackend":"gpu","vtkVersion":"9.x.y",...}
```

See **[docs/windows-gpu-setup.md](windows-gpu-setup.md)** for the full WSL2 + driver setup.

---

## 7. Environment Variables

Copy `.env.example` to `.env`. Never commit `.env`. Never put API keys or passwords in `.env.example`.

```bash
cp .env.example .env
```

Key variables for local dev:

```env
# Skip Keycloak auth — use fixed dev users (dev only)
DEV_BYPASS_AUTH=true

# Rendering mode: server | local | hybrid
RENDER_MODE=server

# Python VTK render server (if running locally or in Docker)
RENDER_SERVER_URL=http://localhost:7001

# Enable NVIDIA GPU rendering (Docker GPU override only)
ENABLE_GPU_RENDERING=false

# WebXR mode (set false to disable, default true)
ENABLE_WEBXR=true

# Never block browsers by name (default false = no blocking)
ENABLE_BROWSER_NAME_BLOCKING=false

# Dataset limits
MAX_DATASET_MB=1000
ALLOWED_DATASET_EXTENSIONS=.vtp,.vtu,.vti
```

Full variable reference: see `.env.example` for all variables with descriptions.

---

## 8. Dataset Instructions

### Built-in public datasets (browser, no backend)

Location: `public/vtp_files/`

Available by default:
- Bones.vtp — bone surface mesh, 26 MB
- LungVessels.vtp — pulmonary vessel tree, 27 MB
- Lungs.vtp — lung surface, 10 MB
- Skull.vtp — skull geometry, 19 MB
- Ventricles.vtp — cardiac ventricles, 16 MB
- diskout.vtp — sample polydata
- earth.vtp — surface mesh

Verify in browser:
```
http://localhost:8081/vtp_files/manifest.json
```

To add a built-in dataset:
1. Copy the file to `public/vtp_files/`
2. Add an entry to `public/vtp_files/manifest.json`:
   ```json
   {
     "id": "builtin-mydata",
     "name": "My Dataset",
     "path": "/vtp_files/mydata.vtp",
     "description": "...",
     "sizeHint": "5 MB"
   }
   ```
3. Restart the dev server.

### Server-side render server datasets

Location: `server/datasets/`

The render server scans this directory at startup. Drop `.vtp`, `.vtu`, or `.vti` files here.

In Docker: `server/datasets/` is mounted at `/app/extra_datasets` in the render server container.

Verify from render server:
```bash
curl http://localhost:7001/datasets
```

For Docker, restart render server after adding files:
```bash
docker-compose restart render-server
```

---

## 9. Collaboration and Session Testing

Test that two browser tabs synchronize state through the Y.js WebSocket layer.

1. Start the frontend (and optionally the Node.js API).
2. Open **http://localhost:8081** in Tab 1.
3. Log in (or skip auth with `DEV_BYPASS_AUTH=true`).
4. Click **Create Session** or open a workspace.
5. Copy the session URL from the address bar (it contains a session or room ID).
6. Open the copied URL in Tab 2 (same browser, different tab, or a different browser).
7. Confirm both tabs show the same session ID in the toolbar.
8. In Tab 1: load a dataset (click it in the left panel).
9. Confirm: the dataset loads in Tab 2 without any action.
10. In Tab 1: rotate or zoom the viewport.
11. Confirm: the camera view updates in Tab 2.
12. In Tab 2: switch to a different dataset.
13. Confirm: Tab 1 switches to the same dataset.

Notes:
- Users in the same session sync; users in different sessions do not.
- The email invitation button is a placeholder — it does not send real email.
- Voice collaboration requires LiveKit (`npm run dev:full` or separate LiveKit setup).

---

## 10. Apple Vision Pro

The Vision Pro browser is a thin client. Start the toolkit on your Windows/NVIDIA machine (or any machine on your network), then connect from Vision Pro over HTTPS.

**Vision Pro cannot use `localhost`** — that resolves to the headset itself. Use an HTTPS tunnel or your machine's local IP with HTTPS.

**Easiest option — ngrok:**

```bash
# After frontend is running on http://localhost:8081:
ngrok http 8081
```

Open the `https://xxxx.ngrok.io` URL in Vision Pro's browser.

If the render server needs to be accessible too:
```bash
# In .env, point to the ngrok or tunnel URL:
RENDER_SERVER_URL=https://your-backend-tunnel-url
```

**Expected result on Vision Pro:**
- App loads in Safari without a fatal browser error
- Main workspace appears
- Dataset list is visible
- Selecting a dataset triggers server-side render
- WebXR "Enter Immersive Mode" button appears if Vision Pro supports `immersive-vr`
- If immersive-vr is not supported, the 2D workspace still works normally

See **[docs/apple-vision-pro.md](apple-vision-pro.md)** for full details including local network HTTPS setup.

---

## 11. Troubleshooting

### "Cannot GET /rooms/:roomId" (404 on page refresh)

The SPA history fallback is enabled by default in Webpack dev server (`historyApiFallback: true`). This should not happen in dev. In production builds, configure the web server to serve `index.html` for all non-asset paths.

### App stuck on "Initializing…" or blank screen

1. Open browser DevTools → Console. Look for errors.
2. Check that the Y.js WebSocket is running: `ws://localhost:9001`.
3. With `DEV_BYPASS_AUTH=false`, check that Keycloak is running (`http://localhost:8080`).
4. If Docker services are down, run `docker-compose up`.

### WebSocket "connected / disconnected" blinking

Usually the Y.js server is restarting or unreachable. Check `node server.js` output or `docker-compose logs yjs`.

### Dataset appears in list but clicking says "Dataset not found"

The render server scans files at startup. If you added files after starting, restart the render server. Also confirm the path in `manifest.json` matches the actual file location.

### Dataset does not sync across two tabs

Confirm both tabs have the same session URL (room/session ID in the path). Users in different sessions do not sync. If IDs match and sync still fails, check the Y.js WebSocket connection in DevTools → Network → WS.

### File fetch failed / "Cannot load VTP"

Check the URL: `http://localhost:8081/vtp_files/Bones.vtp`. If that 404s, the file is missing from `public/vtp_files/`. If in server mode, check `http://localhost:7001/datasets`.

### Fatal browser error on non-Chrome browser

CIA Web uses capability detection, not browser name blocking. If you see "missing required features: WebGL2, WebSocket, IndexedDB", one of those is actually unavailable in that browser. Check DevTools → Console for the specific missing feature. Safari on Vision Pro supports all three.

### GPU not detected in Docker

Run the test command:
```bash
docker run --rm --gpus all nvidia/cuda:12.4.1-base-ubuntu22.04 nvidia-smi
```
If that fails, see **[docs/windows-gpu-setup.md](windows-gpu-setup.md)** troubleshooting section.

### Apple Vision Pro cannot connect

- Do not use `localhost` from Vision Pro — use ngrok, Cloudflare Tunnel, or LAN IP with HTTPS.
- HTTPS is required. HTTP-only URLs will not work for WebXR.
- If using a self-signed cert, install the root CA on Vision Pro first.

### Render server not found / hybrid mode falls back

With `RENDER_MODE=server`, the frontend expects the render server at `RENDER_SERVER_URL`. If it's unreachable:
- Check that `uvicorn` is running on port 7001.
- Check that Docker render server container is healthy: `docker-compose ps render-server`.
- With `RENDER_MODE=hybrid`, the app falls back to browser-side VTK.js for small files.

---

## 12. Verification Checklist

Run through this after initial setup to confirm everything works:

- [ ] Frontend starts (`npm run start:http` → `http://localhost:8081` loads)
- [ ] Render server starts (`curl http://localhost:7001/health` returns `{"ok":true,...}`)
- [ ] Node.js API starts (`curl http://localhost:3001/api/health` returns `{"status":"healthy",...}`)
- [ ] GPU status endpoint (`curl http://localhost:3001/api/gpu/status` returns JSON)
- [ ] Dataset list loads (`curl http://localhost:7001/datasets` returns dataset array)
- [ ] Load Data panel shows built-in datasets (Bones, Lungs, etc.)
- [ ] `.vtp` file renders (load Bones.vtp or Skull.vtp)
- [ ] `.vtu` file renders (if you have a `.vtu` test file in `server/datasets/`)
- [ ] `.vti` file renders (if you have a `.vti` test file)
- [ ] Two browser tabs join the same session (same URL → both show same session ID)
- [ ] Dataset switching syncs (load dataset in Tab 1 → appears in Tab 2)
- [ ] Camera/view movement syncs (rotate in Tab 1 → Tab 2 updates)
- [ ] App does not show fatal browser error when opened in Safari
- [ ] (GPU only) `docker run --rm --gpus all nvidia/cuda:12.4.1-base-ubuntu22.04 nvidia-smi` shows GPU
- [ ] (GPU only) `/api/gpu/status` reports `"gpuAvailable": true`
