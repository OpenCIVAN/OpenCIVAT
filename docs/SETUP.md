# CIA_Web Setup Guide

Step-by-step instructions for getting CIA_Web running from a blank machine. Follow the sections in order.

---

## Table of Contents

1. [Install Prerequisites](#1-install-prerequisites)
2. [Clone the Repository](#2-clone-the-repository)
3. [Configure Environment Variables](#3-configure-environment-variables)
4. [Generate SSL Certificates](#4-generate-ssl-certificates)
5. [Install Node Dependencies](#5-install-node-dependencies)
6. [Start Backend Services (Docker)](#6-start-backend-services-docker)
7. [Start the Frontend](#7-start-the-frontend)
8. [Verify Everything Works](#8-verify-everything-works)
9. [Optional: Voice Chat (LiveKit)](#9-optional-voice-chat-livekit)
10. [Stopping the Project](#10-stopping-the-project)
11. [Troubleshooting First-Run Issues](#11-troubleshooting-first-run-issues)

---

## 1. Install Prerequisites

### Node.js (v18 or higher)

Check if you already have it:
```bash
node --version   # should print v18.x.x or higher
npm --version
```

If not installed, use a version manager (recommended) or the official installer:

**Using nvm (recommended):**
```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Restart your terminal, then:
nvm install 20
nvm use 20
```

**Or download from:** https://nodejs.org/ (choose the LTS version)

---

### Docker Desktop

Docker runs the backend stack (PostgreSQL, MinIO, Redis, Keycloak, the API, Yjs service, workers, and optionally the Matrix bridge).

**macOS:** Download from https://www.docker.com/products/docker-desktop/  
**Windows:** Same link — requires WSL2 (Docker Desktop will guide you through that).  
**Linux:** Follow the [Docker Engine install guide](https://docs.docker.com/engine/install/) for your distro, then install [Docker Compose v2](https://docs.docker.com/compose/install/).

After installing, start Docker Desktop. Verify:
```bash
docker --version          # Docker version 24.x or higher
docker compose version    # Docker Compose version v2.x
```

> **Note:** Scripts use `docker-compose` (with a hyphen). Docker Desktop installs both the plugin and the legacy binary. On Linux with only the plugin, either install the standalone binary or use `docker compose` instead.

---

### OpenSSL (for SSL certificates)

macOS: pre-installed.  
Windows: install [Git for Windows](https://git-scm.com/download/win) or `choco install openssl`.  
Linux: `sudo apt install openssl` or equivalent.

```bash
openssl version   # should print OpenSSL 3.x or similar
```

---

### LiveKit Server (optional — only needed for voice chat)

Skip this if you don't need voice chat. You can always add it later.

**macOS:**
```bash
brew install livekit
```

**Linux/macOS (alternative):**
```bash
curl -sSL https://get.livekit.io | bash
```

**Windows:** Download the binary from https://github.com/livekit/livekit/releases

---

## 2. Clone the Repository

```bash
git clone <repository-url>
cd CIA_Web
```

---

## 3. Configure Environment Variables

```bash
cp .env.example .env
```

The default values in `.env.example` are working dev credentials — you don't need to change anything to get started locally. Key variables:

| Variable | Default | Purpose |
|----------|---------|---------|
| `POSTGRES_PASSWORD` | `ciadevpassword` | PostgreSQL password |
| `MINIO_ROOT_PASSWORD` | `minioadmin` | MinIO admin password |
| `KEYCLOAK_ADMIN_PASSWORD` | `admin123` | Keycloak admin password |
| `DEV_BYPASS_AUTH` | `false` | Set to `true` to skip Keycloak auth checks |
| `INTERNAL_API_TOKEN` | `dev-internal-token` | Worker → API callback auth |
| `MATRIX_FEDERATION_ENABLED` | `false` | Enable Matrix federation (optional) |

> **Security:** Never commit your `.env` file. It is already in `.gitignore`.

---

## 4. Generate SSL Certificates

WebXR requires HTTPS. We use self-signed certificates for local development.

```bash
openssl req -x509 -newkey rsa:4096 \
  -keyout certs/key.pem \
  -out certs/cert.pem \
  -days 365 -nodes \
  -subj "/CN=localhost"
```

> **Note:** `certs/` is in `.gitignore` — never commit these files.

**You will see a browser security warning** the first time you open the app. This is expected:
- **Chrome/Edge:** Click **Advanced → Proceed to localhost (unsafe)**
- **Firefox:** Click **Advanced → Accept the Risk and Continue**

Alternatively, use HTTP mode to avoid certificate setup entirely:

```bash
npm run start:http   # runs without TLS (some WebXR features won't work)
```

---

## 5. Install Node Dependencies

```bash
npm install
```

**Only run this from the project root.** The backend API (`server/`) has its own `package.json`, but Docker installs those dependencies automatically when it builds the `api` container — you never need to `cd server && npm install` manually.

If you update `server/package.json`, rebuild the container to pick up the changes:
```bash
docker-compose build api
docker-compose up -d api
```

---

## 6. Start Backend Services (Docker)

This starts all backend services: PostgreSQL, MinIO, Redis, Keycloak, the Node API, the Yjs WebSocket server, the VTK Python worker, the thumbnail worker, and optionally the Matrix bridge.

```bash
./scripts/start.sh
```

Or directly:

```bash
docker-compose up -d
```

**What to expect on first run:**
1. Docker pulls all base images (~1–3 GB, one time only)
2. Containers start — most are healthy within 15 seconds
3. **Keycloak takes 60–90 seconds** to initialize — this is normal
4. The API waits for all dependencies before accepting requests

Check that everything is healthy:

```bash
./scripts/check-services.sh
# or
docker-compose ps
```

Verify the API is up:
```bash
curl http://localhost:3001/api/health
```

---

## 7. Start the Frontend

In a **new terminal** (leave Docker running in the background):

```bash
npm start
```

The first compile takes **2–4 minutes** — VTK.js, Three.js, and TensorFlow.js are very large. You will see percentage progress in the terminal. After that, subsequent hot-reloads when you save a file are nearly instant.

Once compilation finishes, open **`https://localhost:8081`** in your browser (or `http://localhost:8081` if using HTTP mode).

> **Tip:** `npm start` no longer auto-opens a browser tab because the certificate prompt was causing the startup process to hang. Just open the URL manually once you see `webpack compiled successfully`.

---

## 8. Verify Everything Works

| Service | URL | Check |
|---------|-----|-------|
| Frontend | `https://localhost:8081` | App loads, no console errors |
| API | `http://localhost:3001/api/health` | Returns `{"status":"ok"}` |
| MinIO Console | `http://localhost:9002` | Login: `minioadmin` / `minioadmin` |
| Keycloak Admin | `http://localhost:8080` | Login: `admin` / `admin123` |
| Yjs WebSocket | `ws://localhost:9001` | Check: `docker-compose logs yjs` |

Quick functional test:
1. Upload a `.vtp` file — it should appear in the file panel
2. Open a second browser tab at `https://localhost:8081` — cursors should sync between tabs
3. Check `docker-compose logs api` for any errors

---

## 9. Optional: Voice Chat (LiveKit)

Requires LiveKit installed from [Step 1](#1-install-prerequisites).

```bash
# Terminal 1 — LiveKit server
./scripts/start-livekit.sh
# or: livekit-server --dev

# Terminal 2 — Token server
node token-server.js
```

Or start everything together:
```bash
npm run dev:full        # frontend + API server + Yjs + token server + LiveKit (HTTPS)
npm run dev:full:http   # same but using HTTP (no certs needed)
```

Test: open the app in two tabs, click **Join Voice Chat** in both, grant microphone access — you should hear a slight echo between tabs.

---

## 10. Stopping the Project

**Stop the frontend:** `Ctrl+C` in the terminal running `npm start`

**Stop Docker services (data preserved):**
```bash
./scripts/stop.sh
# or: docker-compose down
```

**Kill all dev processes by port:**
```bash
npm run stop      # kills ports 8080, 3000, 3001, 8000
npm run stop:all  # also kills LiveKit ports 7880, 7881
```

**Full reset (wipes all data):**
```bash
./scripts/reset-database.sh   # prompts for confirmation
```

---

## 11. Troubleshooting First-Run Issues

### Docker Desktop isn't running
```
Error: Cannot connect to the Docker daemon
```
→ Start Docker Desktop and wait for it to fully load (whale icon stops animating), then retry.

---

### Port already in use
```
Error: bind: address already in use
```
Find and stop what's using the port:
```bash
lsof -i :3001   # replace with the conflicting port
kill -9 <PID>
```

Common conflicts: `5432` (local PostgreSQL), `8080` (Keycloak vs local servers), `3001` (previous API process).

---

### Keycloak is slow or unhealthy
Keycloak needs 60–90 seconds on first run. Check:
```bash
docker-compose logs keycloak --tail=20
docker-compose restart keycloak   # if still failing after 2 minutes
```

---

### API won't start
```bash
docker-compose logs api
docker-compose build api --no-cache   # if you changed server code
docker-compose up -d api
```

---

### Frontend webpack hangs at startup with no output

If `npm start` shows the command but nothing happens for more than 30 seconds:

1. Wait for the proxy message: `[HPM] Proxy created: /api -> http://localhost:3001` — this confirms webpack-dev-server initialized
2. After that message, webpack begins compiling — the first compile shows percentage progress and takes 2–4 minutes
3. If it hangs before the proxy message, check if backend services are running: `./scripts/check-services.sh`

If you need to test without the cert setup, use `npm run start:http` instead.

---

### Browser shows CORS errors
1. Is the API running? `curl http://localhost:3001/api/health`
2. Is `ALLOWED_ORIGINS` in `.env` set to `http://localhost:8081,https://localhost:8081`?
3. Restart: `docker-compose restart api`

---

### Collaborative cursors not syncing
```bash
docker-compose logs yjs
docker-compose up -d yjs   # restart if not running
```

---

### First run downloads are slow
The first `docker-compose up` downloads all base images (Node, PostgreSQL, MinIO, Redis, Keycloak, Python) — about 1–3 GB total. This only happens once; subsequent starts are fast.

---

## Day-to-Day Development Workflow

```bash
# Terminal 1 — start backend once, leave running
docker-compose up -d

# Terminal 2 — start frontend (restart as needed)
npm start

# Health check
./scripts/check-services.sh
```

**More resources:**
- [DEVELOPMENT.md](DEVELOPMENT.md) — service URLs, database access, API testing, daily workflow
- [ARCHITECTURE.md](ARCHITECTURE.md) — system design, data model, full API reference
- [CLEANUP_PROCEDURES.md](CLEANUP_PROCEDURES.md) — resetting and cleaning up the dev environment
- [VR_EXPLORATION_TESTING.md](VR_EXPLORATION_TESTING.md) — VR-specific testing guide
