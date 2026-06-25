# Installation

This guide covers setting up OpenCIVAN for local development or self-hosted research deployment.

---

## Navigation

| | |
|---|---|
| [Prerequisites](#prerequisites) | [Quick Start](#quick-start) |
| [Environment Variables](#environment-variables) | [Service Configuration](#service-configuration) |
| [Frontend Dev Server](#frontend-dev-server) | [Authentication](#authentication) |
| [Loading Data](#loading-data) | [WebXR / Immersive Mode](#webxr--immersive-mode) |
| [Production Deployment](#production-deployment) | [Troubleshooting](#troubleshooting) |

---

## Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| Node.js | ≥ 18 | For frontend build and API server |
| npm | ≥ 9 | Bundled with Node.js |
| Docker Desktop | ≥ 24 | Runs all backend services |
| Git | any | |
| Chrome / Chromium | ≥ 120 | Recommended browser (WebXR support) |
| WebXR browser | — | Any modern browser; Apple Vision Pro, Meta Quest, Chrome/Edge all work |

Python 3.10+ and the VTK Python package are used by the compute worker inside Docker — no host Python installation required.

---

## Quick Start

```bash
# 1. Clone
git clone https://github.com/<your-org>/opencivan.git
cd opencivan

# 2. Configure
cp .env.example .env
# Edit .env to set passwords, ports, etc.

# 3. Start backend services
./scripts/start.sh

# 4. Install frontend dependencies
npm install

# 5. Start frontend
npm start
```

Open **https://localhost:8081** in Chrome. Accept the self-signed certificate warning (click **Advanced → Proceed**).

---

## Environment Variables

Copy `.env.example` to `.env` and configure the variables below. Defaults work for local development.

<details>
<summary>Core variables</summary>

| Variable | Default | Description |
|---|---|---|
| `DEV_BYPASS_AUTH` | `false` | `true` = skip Keycloak, use fixed dev users |
| `USE_HTTP` | `false` | `true` = HTTP instead of HTTPS (needed for LiveKit in some setups) |
| `API_PORT` | `3001` | Express API port |
| `YJS_WS_PORT` | `9001` | Y.js WebSocket port |
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_NAME` | `ciadb` | Database name |
| `DB_USER` | `ciauser` | Database user |
| `DB_PASSWORD` | `ciadevpassword` | Database password — **change in production** |
| `MINIO_HOST` | `localhost` | MinIO host |
| `MINIO_PORT` | `9000` | MinIO API port |
| `MINIO_USER` | `minioadmin` | MinIO access key — **change in production** |
| `MINIO_PASSWORD` | `minioadmin` | MinIO secret key — **change in production** |
| `REDIS_HOST` | `localhost` | Redis host |
| `REDIS_PORT` | `6379` | Redis port |

</details>

<details>
<summary>Auth / Keycloak variables</summary>

| Variable | Default | Description |
|---|---|---|
| `KEYCLOAK_URL` | `http://localhost:8080` | Keycloak base URL |
| `KEYCLOAK_REALM` | `cia` | Realm name |
| `KEYCLOAK_CLIENT_ID` | `cia-web` | Client ID |
| `KEYCLOAK_ADMIN_USER` | `admin` | Keycloak admin username |
| `KEYCLOAK_ADMIN_PASSWORD` | `admin123` | Keycloak admin password — **change in production** |

</details>

<details>
<summary>LiveKit voice variables</summary>

| Variable | Description |
|---|---|
| `LIVEKIT_URL` | LiveKit server WebSocket URL |
| `LIVEKIT_TOKEN_URL` | LiveKit token server URL |
| `LIVEKIT_API_KEY` | LiveKit API key |
| `LIVEKIT_API_SECRET` | LiveKit API secret |

LiveKit is optional for development. Voice features will be disabled if these are not set.

</details>

---

## Service Configuration

All backend services run in Docker. The `docker-compose.yml` defines:

| Service | Port | Description |
|---|---|---|
| `postgres` | 5432 | PostgreSQL 15 database |
| `minio` | 9000 / 9002 | Object storage (datasets) |
| `redis` | 6379 | Job queue and cache |
| `api` | 3001 | Express REST API |
| `yjs` | 9001 | Y.js WebSocket server |
| `keycloak` | 8080 | OIDC authentication (optional in dev) |
| `vtk-worker` | — | Python VTK compute jobs |
| `thumbnail-worker` | — | Puppeteer thumbnail generation |

### Start / stop

```bash
./scripts/start.sh           # start all services
./scripts/stop.sh            # stop, keep data volumes
./scripts/stop.sh --clean    # stop and wipe all volumes
./scripts/restart.sh         # restart
./scripts/check-services.sh  # health check
```

### Rebuild API after server changes

```bash
./scripts/rebuild-api.sh
```

---

## Database

On first start, `init.sql` is applied automatically. After wiping volumes, re-apply:

```bash
./scripts/reset-database.sh          # interactive
./scripts/reset-database.sh --quick  # no prompts
```

After a database reset, clear browser storage to remove stale cached IDs:

```javascript
// In browser console:
indexedDB.deleteDatabase('cia-datasets');
location.reload();
```

Seed demo users for collaboration testing:

```bash
./scripts/setup-local-auth.sh   # creates Keycloak test users
./scripts/seed-mock-users.sh    # seeds mock users (dev bypass mode)
./scripts/load-demo-files.sh    # uploads demo VTP files to MinIO
```

---

## Frontend Dev Server

```bash
npm start               # HTTPS on port 8081 (default)
npm run start:http      # HTTP mode (port 8081) — use when testing LiveKit
npm run dev             # frontend + API + Y.js together
npm run dev:full        # all of the above + LiveKit token server
```

The Webpack config proxies `/api/*` to `http://localhost:3001`.

### SSL certificates

`npm start` requires TLS certificates at `certs/key.pem` and `certs/cert.pem`. Generate self-signed certificates:

```bash
mkdir -p certs
openssl req -x509 -newkey rsa:4096 -keyout certs/key.pem -out certs/cert.pem \
  -days 365 -nodes -subj '/CN=localhost'
```

---

## Authentication

### Development (no Keycloak)

Set `DEV_BYPASS_AUTH=true` in `.env`. The app will not require login. You can switch between built-in dev users using the `DevUserSwitcher` component or by passing the `x-user-id` header:

| User | UUID suffix | Role |
|---|---|---|
| CIA Admin | `...0002` | Default user |
| Alice | `...0003` | Collaborator |
| Bob | `...0004` | Collaborator |
| Viewer | `...0005` | Read-only |

### Production (Keycloak)

Set `DEV_BYPASS_AUTH=false` and configure Keycloak. Import the provided realm configuration (TBD) or set up a realm manually with the client ID matching `KEYCLOAK_CLIENT_ID`.

---

## Loading Data

OpenCIVAN currently supports VTK PolyData (`.vtp`, `.vtk`) files.

1. Open the app and click **Load Data** in the top bar.
2. Select a `.vtp` or `.vtk` file.
3. The file is uploaded to MinIO via the API and registered in the database.
4. The dataset appears in the canvas; click a cell to open it in a VTK view.

Demo files can be loaded automatically:

```bash
./scripts/load-demo-files.sh
```

---

## WebXR / Immersive Mode

WebXR requires HTTPS. The app uses capability detection — it works in any browser that supports WebXR, including Apple Vision Pro, Meta Quest browsers, and desktop WebXR browsers.

### Steps

1. Start the toolkit over HTTPS (use `npm start` with SSL certs, or expose via ngrok/Cloudflare Tunnel).
2. Open the HTTPS URL in your target browser or headset.
3. Accept any certificate warning.
4. Join or create a session.
5. Click **Enter Immersive Mode** in the toolbar. The browser requests permission to enter immersive VR.

> **Note:** WebXR requires a [secure context](https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts). HTTP mode will not allow immersive VR entry.

For Apple Vision Pro specifically, see **[docs/apple-vision-pro.md](apple-vision-pro.md)**.

For the full WebXR + headset workflow from a Windows machine, see **[docs/getting-started.md](getting-started.md#10-apple-vision-pro)**.

---

## Production Deployment

> Production deployment documentation is planned for v0.2. Until then, use the development setup with proper secrets.

Key things to change for any shared or production deployment:

- Set strong passwords for PostgreSQL, MinIO, Redis, and Keycloak.
- Replace self-signed certificates with a valid TLS certificate (Let's Encrypt or similar).
- Set `DEV_BYPASS_AUTH=false` and configure Keycloak properly.
- Restrict network access: only the frontend port (8081 or 443) should be publicly exposed.
- Set up regular database and MinIO backups.

---

## Troubleshooting

<details>
<summary>Frontend can't reach the API</summary>

- Check that the Docker services are running: `./scripts/check-services.sh`
- Check that port 3001 is not blocked by a firewall.
- Check the browser console for `net::ERR_CONNECTION_REFUSED` on `/api/*` requests.

</details>

<details>
<summary>WebXR / Enter VR button not shown</summary>

- WebXR requires HTTPS. Make sure you are on `https://`, not `http://`.
- The headset browser must have accepted the certificate. Navigate directly to the HTTPS URL first.
- Try `navigator.xr.isSessionSupported('immersive-vr')` in the browser console — it should return `true`.

</details>

<details>
<summary>Y.js / collaboration not working</summary>

- Check that the `yjs` Docker service is running on port 9001.
- Check browser console for WebSocket connection errors.
- Verify `YJS_WS_URL` in `.env` resolves from the client machine.

</details>

<details>
<summary>Database reset / stale local data</summary>

After resetting the database, clear browser IndexedDB:

```javascript
indexedDB.deleteDatabase('cia-datasets');
location.reload();
```

</details>

<details>
<summary>Port conflicts</summary>

If a port is already in use, edit `docker-compose.yml` to remap the conflicting service, and update the corresponding variable in `.env`.

</details>
