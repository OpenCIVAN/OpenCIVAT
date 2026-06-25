# Server-Side Rendering Architecture

## Why Server-Side Rendering

Browser-based VTK.js rendering has hard limits:

- Large datasets (20–50 MB VTP files) must be fully downloaded to the browser before rendering begins
- WebGL is limited by GPU memory available to the browser tab
- VR headsets (Quest) have constrained GPUs that cannot handle complex scientific geometry
- Browser-side VTK.js does not support all VTK features (volume rendering, filters, pipelines)

The CIA_Web server-rendering architecture moves compute and rendering to a dedicated Python VTK server. The browser becomes a thin client that:
- Displays rendered PNG/JPEG frames in an `<img>` element
- Forwards mouse/wheel events as camera commands
- Receives updated frames at interactive rates

---

## Local Architecture

```
Browser (thin client)
  └─ ServerRenderedViewport.jsx
       ├─ <img> updated with server PNG frames
       └─ mouse events → RemoteRenderClient.js
            └─ WebSocket /render-ws → Python Render Server (port 7000)
                    ├─ VTKRenderer (offscreen render window)
                    ├─ Session manager (1 renderer per browser tab)
                    └─ Dataset discovery from DATASET_DIR

Webpack dev proxy:
  /render-api/* → http://localhost:7001   (HTTP)
  /render-ws    → ws://localhost:7001/ws  (WebSocket)
```

---

## Supported Formats

| Extension | VTK Reader | Mapper | Notes |
|-----------|-----------|--------|-------|
| `.vtp` | `vtkXMLPolyDataReader` | `vtkPolyDataMapper` | Surface mesh, point clouds |
| `.vtu` | `vtkXMLUnstructuredGridReader` | `vtkDataSetMapper` | Volume mesh, FEM output |
| `.vti` | `vtkXMLImageDataReader` | `vtkDataSetMapper` | Structured grid, CT/MRI data |

---

## Dataset Discovery

The render server scans `DATASET_DIR` (and optionally `EXTRA_DATASET_DIR`) at startup for `*.vtp`, `*.vtu`, `*.vti` files.

**In Docker** (docker-compose.yml):
- `public/vtp_files/` is mounted read-only at `/app/datasets`
- `server/datasets/` is mounted at `/app/extra_datasets` for additional files

**Standalone**:
```bash
DATASET_DIR=/path/to/vtp_files uvicorn app:app --port 7000
```

Dataset IDs are slugified filenames: `Bones.vtp` → `bones`, `LungVessels.vtp` → `lung-vessels`.

---

## How to Run Locally

### Option A: Standalone Python (fastest for dev)

The webpack dev server proxies `/render-api` and `/render-ws` to `localhost:7001`, so run uvicorn on **port 7001** when developing locally without Docker.

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

In a separate terminal, start the frontend:
```bash
cd ../..
# Ensure .env has RENDER_MODE=server
npm run start:http
```

Open http://localhost:8081 — Load Data modal shows Server Datasets.

### Option B: Docker Compose

```bash
# Build and start the render server + all services
docker compose up render-server

# In separate terminal, start frontend
npm run start:http

# Open http://localhost:8081
```

### Verify the server is running

```bash
curl http://localhost:7001/health
# {"ok":true,"vtk_available":true,"vtk_version":"9.x.y","dataset_count":7,...}

curl http://localhost:7001/datasets
# [{"id":"bones","name":"Bones","path":"/app/datasets/Bones.vtp","type":"vtp","sizeMB":26.0},...}

curl -X POST http://localhost:7001/load \
  -H "Content-Type: application/json" \
  -d '{"datasetId":"bones","path":"/app/datasets/Bones.vtp"}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['metadata'])"

curl "http://localhost:7001/frame?sessionId=<session-id>" --output frame.png
```

---

## Environment Variables

### Frontend (webpack reads from `.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `RENDER_MODE` | `local` | `server` \| `local` \| `hybrid` |
| `RENDER_SERVER_URL` | `http://localhost:7001` | Render server HTTP base URL |
| `RENDER_WS_URL` | `/render-ws` | WebSocket URL (proxied by webpack in dev) |

Set `RENDER_MODE=server` in `.env` and restart webpack to activate server rendering.

### Render Server (Python)

| Variable | Default | Description |
|----------|---------|-------------|
| `DATASET_DIR` | `./datasets` | Primary dataset scan directory |
| `EXTRA_DATASET_DIR` | `` | Optional secondary directory |
| `RENDER_WIDTH` | `1024` | Frame width in pixels |
| `RENDER_HEIGHT` | `768` | Frame height in pixels |
| `MAX_SESSIONS` | `10` | Max concurrent render sessions |

---

## How to Add Datasets

**For development:**
1. Copy `.vtp`, `.vtu`, or `.vti` files to `public/vtp_files/`
2. Restart the render server (it scans at startup)
3. Or: run the server with `--reload` flag (auto-restarts on file changes)

**For Docker:**
1. Copy files to `server/datasets/`
2. `docker compose restart render-server`

---

## Frontend Protocol

### WebSocket (preferred for interaction)

```
Browser                           Render Server
  |                                    |
  |── { type: "loadDataset", ... } ──→|
  |←── { type: "datasetLoaded", ... } |
  |←── { type: "frame", image: ... }  |
  |                                    |
  |── { type: "cameraUpdate", ... } ──|
  |←── { type: "frame", image: ... }  |
  |                                    |
  |── { type: "resetCamera" } ────────|
  |←── { type: "frame", camera: ... } |
```

### HTTP (fallback / one-shot)

- `GET /health` — Server status
- `GET /datasets` — Dataset listing
- `POST /load` — Load dataset, get metadata + first frame (base64 PNG in JSON)
- `POST /camera` — Update camera, get new frame
- `GET /frame?sessionId=...` — Latest frame as `image/png`

---

## Key Source Files

| File | Purpose |
|------|---------|
| `server/render_server/app.py` | FastAPI app, HTTP + WebSocket endpoints |
| `server/render_server/vtk_renderer.py` | VTK offscreen render pipeline |
| `server/render_server/dataset_loader.py` | Dataset directory scanner |
| `server/render_server/render_state.py` | Per-session VTKRenderer manager |
| `src/services/RemoteRenderClient.js` | WebSocket client singleton |
| `src/services/DatasetApiClient.js` | HTTP client for one-shot requests |
| `src/rendering/ServerRenderedViewport.jsx` | React component showing rendered frames |
| `src/rendering/LocalVtkFallbackRenderer.js` | Hybrid mode fallback utilities |

---

## Rendering Modes

| Mode | Behavior |
|------|----------|
| `server` | All datasets load and render via Python VTK server. Browser shows `<img>` frames. |
| `local` | Existing VTK.js browser path only. No render server required. |
| `hybrid` | Server mode with local VTK.js fallback if server is unreachable. |

Switch modes by setting `RENDER_MODE` in `.env` and restarting webpack.

---

## GPU Rendering (Windows/NVIDIA Docker)

By default the render server uses Mesa software rendering (CPU). On Windows with an NVIDIA GPU, use the GPU Docker override to enable EGL-accelerated rendering.

**Prerequisite:** test GPU access:
```bash
docker run --rm --gpus all nvidia/cuda:12.4.1-base-ubuntu22.04 nvidia-smi
```

**Run with GPU:**
```bash
docker-compose -f docker-compose.yml -f docker-compose.gpu.yml up render-server
```

This passes `--gpus all` to the render server container and sets `ENABLE_GPU_RENDERING=true` and `NVIDIA_VISIBLE_DEVICES=all`. VTK auto-selects EGL offscreen rendering when an NVIDIA GPU is present and Mesa falls back when it is not.

**Verify GPU is active:**
```bash
curl http://localhost:3001/api/gpu/status
```

Expected when GPU is available:
```json
{
  "gpuAvailable": true,
  "nvidiaSmiAvailable": true,
  "renderingBackend": "gpu",
  "vtkVersion": "9.x.y",
  "dockerRuntimeInfo": "NVIDIA GeForce RTX 4080, 560.00"
}
```

See **[docs/windows-gpu-setup.md](../docs/windows-gpu-setup.md)** for full Windows + WSL2 + driver setup.

---

## Future AWS Deployment

> **No AWS credentials in this codebase.** The following is documentation only.

### Recommended AWS Architecture

1. **Compute**: EC2 `g4dn.xlarge` (NVIDIA T4 GPU) for GPU-accelerated VTK rendering
   - VTK supports EGL offscreen rendering on NVIDIA GPUs — much faster than Mesa software
   - For CPU-only rendering, `c6i.2xlarge` or `m6i.2xlarge` are cost-effective

2. **Container**: Package `server/render_server/` in Docker, deploy via ECS on EC2
   - ECS task definition with GPU support (`resourceRequirements: GPU`)
   - Service with Application Load Balancer for the HTTP/WebSocket endpoint

3. **Datasets**: Store `.vtp`/`.vtu`/`.vti` files in S3
   - Render server downloads on demand (or pre-fetches via S3 mount / `mountpoint-s3`)
   - Use IAM role attached to EC2 instance — no access keys needed

4. **Secrets**: AWS Secrets Manager or SSM Parameter Store for any secrets
   - Never put credentials in code, `.env`, or Docker images

5. **Required env vars** (add to `.env.example` only — never set in dev):
   ```
   # AWS_REGION=us-east-1
   # AWS_S3_BUCKET=cia-datasets-prod
   # AWS_RENDER_ENDPOINT=https://render.your-domain.com
   ```

### No AWS code in this repo
Until explicitly added, there are no S3, EC2, or ECS dependencies in this codebase.
All AWS-specific code should be in a separate deployment repository or added behind a feature flag.
