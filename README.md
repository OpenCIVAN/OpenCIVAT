# CIA Web

**Collaborative Immersive Analytics Platform**

A real-time collaborative platform for immersive scientific data visualization. CIA Web combines **VTK.js**, **WebXR**, **React**, and **Y.js** to enable multi-user interaction, voice/text communication, and high-dimensional data exploration in both desktop and VR environments.

> **Architecture:** Server-authoritative with PostgreSQL persistence, MinIO file storage, and Y.js real-time sync.

---

## Features

### Visualization & Analysis
- **3D Volume & Mesh Rendering** - VTK.js-powered scientific visualization
- **Multi-view Canvas** - Grid layout with draggable, resizable view cells
- **View Linking** - Sync camera, filters, selections across views
- **WebXR/VR Support** - Immersive data exploration with VR headsets

### Real-Time Collaboration
- **Multi-user Presence** - See collaborators' cursors and activity
- **View Following** - Follow another user's view in real-time
- **Voice Chat** - WebRTC-based voice communication via LiveKit
- **Text Chat** - Persistent chat with room history
- **Shared Annotations** - Collaborative 3D markers and notes

### Server-Authority Architecture
- **PostgreSQL** - Persistent storage for all state
- **MinIO** - S3-compatible object storage for files
- **Y.js** - CRDT-based real-time synchronization
- **Redis** - Job queue for compute workers

---

## Prerequisites

- **Docker Desktop** - [Download](https://www.docker.com/products/docker-desktop/)
- **Node.js 18+** - [Download](https://nodejs.org/)
- **Git** - [Download](https://git-scm.com/)
- **OpenSSL** - For generating SSL certificates (included on macOS/Linux)

Optional:
- **VR Headset** - For WebXR features (Quest, Vive, etc.)
- **LiveKit Server** - For voice chat ([Installation](https://docs.livekit.io/realtime/self-hosting/local/))

---

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd CIA_Web
```

### 2. Create Environment File

```bash
cp .env.example .env
```

The default values work for local development. For production, update the passwords.

### 3. Generate SSL Certificates

SSL is required for WebXR (VR) to work in browsers:

```bash
mkdir -p certs
openssl req -x509 -newkey rsa:4096 \
  -keyout certs/key.pem \
  -out certs/cert.pem \
  -days 365 \
  -nodes \
  -subj "/CN=localhost"
```

> **Note:** The `certs/` folder is gitignored. Never commit certificates.

### 4. Start Backend Services

For a local demo without Keycloak, start the backend in dev bypass mode:

```bash
DEV_BYPASS_AUTH=true ./scripts/start.sh
```

If you instead want to use Keycloak auth, leave `DEV_BYPASS_AUTH=false` and configure Keycloak per the docs.

This starts all Docker services:
- PostgreSQL (database)
- MinIO (file storage)
- Redis (job queue)
- API server
- Y.js WebSocket server
- VTK compute worker
- Thumbnail worker

Wait for all health checks to pass (~30 seconds).

### Optional: One-step demo setup

If you want the fastest local demo path, use the helper script to reset the database, start services, and upload demo files with the dev bypass auth flow:

```bash
./scripts/demo-setup.sh
```

### 5. Install Frontend Dependencies

```bash
npm install
```

### 6. Start Frontend

```bash
npm start
```

The app opens at `https://localhost:8081`

### 7. Accept SSL Warning

Your browser will warn about the self-signed certificate:
1. Click **Advanced**
2. Click **Proceed to localhost (unsafe)**

This is normal for local development.

---

## Service URLs

| Service | URL | Credentials |
|---------|-----|-------------|
| **Frontend** | https://localhost:8081 | - |
| **API** | http://localhost:3001 | - |
| **MinIO Console** | http://localhost:9002 | minioadmin / minioadmin |
| **PostgreSQL** | localhost:5432 | ciauser / ciadevpassword |
| **Y.js WebSocket** | ws://localhost:9001 | - |
| **Keycloak** | http://localhost:8080 | admin / admin123 |
| **Redis** | localhost:6379 | - |

---

## Project Structure

```
CIA_Web/
├── src/
│   ├── core/                   # Core services & data layer
│   │   ├── data/               # Managers (ViewConfiguration, Dataset, etc.)
│   │   ├── services/           # EventBus, WebSocket, etc.
│   │   └── rendering/          # VTK rendering pipeline
│   ├── ui/
│   │   └── react/
│   │       ├── components/     # Atomic design components
│   │       │   ├── atoms/      # Button, Icon, Input, etc.
│   │       │   ├── molecules/  # SearchBar, ColorPicker, etc.
│   │       │   ├── organisms/  # InstanceCard, ViewContextBlock, etc.
│   │       │   ├── panels/     # LeftPanel, RightPanel, FloatingPanel
│   │       │   └── workspace/  # Canvas, CanvasCell, Toolbars
│   │       ├── hooks/          # React hooks
│   │       └── styles/         # SCSS tokens & themes
│   └── vr/                     # WebXR/VR implementation
├── server/
│   ├── api/                    # Express REST API
│   ├── database/               # PostgreSQL migrations & schema
│   └── yjs/                    # Y.js WebSocket server
├── workers/
│   ├── vtk-python/             # Python VTK compute worker
│   └── thumbnail-node/         # Headless Chrome thumbnail generator
├── scripts/                    # Development scripts
├── docs/                       # Documentation
├── certs/                      # SSL certificates (gitignored)
├── docker-compose.yml          # Service orchestration
└── .env                        # Environment variables (gitignored)
```

---

## Development Scripts

| Script | Purpose |
|--------|---------|
| `./scripts/start.sh` | Start all Docker services |
| `./scripts/stop.sh` | Stop all services |
| `./scripts/restart.sh` | Restart Docker services |
| `./scripts/reset-database.sh` | Reset database (with confirmation) |
| `./scripts/check-services.sh` | Check service health |
| `npm start` | Start frontend dev server |
| `npm run build` | Production build |
| `npm run storybook` | Component library |

See `scripts/README.md` for full script documentation.

---

## Architecture

### Three-Layer Data Model

```
Dataset           → Raw data files (server-authoritative, stored in MinIO)
    ↓
ViewConfiguration → How to visualize: camera, filters, colors (linkable)
    ↓
Instance Window   → Live GPU renderer on canvas (ephemeral, client-side)
```

### Server-Authority Pattern

All persistent state lives on the server. Clients request changes, server validates and broadcasts:

```
Client Action → WebSocket → Server Validation → Y.js Broadcast → All Clients Update
```

### Docker Services

```
┌─────────────────────────────────────────────────────────────┐
│                     Docker Compose                          │
├─────────────┬─────────────┬─────────────┬─────────────────┤
│ PostgreSQL  │    MinIO    │    Redis    │    Keycloak     │
│   (data)    │   (files)   │   (queue)   │    (auth)       │
├─────────────┴─────────────┴─────────────┴─────────────────┤
│              API Server (Express + Node.js)                │
├─────────────┬─────────────────────────────────────────────┤
│ Y.js Server │        VTK Worker    │   Thumbnail Worker   │
│  (sync)     │       (compute)      │    (rendering)       │
└─────────────┴─────────────────────────────────────────────┘
```

---

## Technology Stack

### Frontend
- **React 18** - UI framework
- **VTK.js** - Scientific visualization
- **Y.js** - Real-time collaboration (CRDT)
- **SCSS** - Styling with design tokens
- **Webpack 5** - Module bundling

### Backend
- **Node.js / Express** - REST API
- **PostgreSQL 15** - Database
- **MinIO** - S3-compatible object storage
- **Redis 7** - Job queue
- **Keycloak 23** - Authentication (optional)

### Workers
- **Python + VTK** - Server-side compute
- **Puppeteer** - Headless thumbnail generation

### Collaboration
- **Y.js** - CRDT-based sync
- **LiveKit** - WebRTC voice chat

---

## Environment Variables

Key variables in `.env`:

```bash
# Database
POSTGRES_USER=ciauser
POSTGRES_PASSWORD=change_me_in_production
POSTGRES_DB=cia_analytics

# MinIO
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=change_me_in_production

# API
NODE_ENV=development
PORT=3001

# Authentication (optional)
DEV_BYPASS_AUTH=true  # Set to false in production
KEYCLOAK_ADMIN_PASSWORD=change_me_in_production
```

---

## Voice Chat Setup (Optional)

Voice chat requires LiveKit:

### Install LiveKit

```bash
# macOS
brew install livekit

# Linux/macOS alternative
curl -sSL https://get.livekit.io | bash
```

### Start LiveKit Server

```bash
livekit-server --dev
```

### Configure Token Server

The API server handles LiveKit token generation. Set in `.env`:

```bash
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret
LIVEKIT_URL=ws://localhost:7880
```

---

## WebXR / VR Mode

### Supported Browsers
- **Chrome/Edge** - Full support
- **Firefox** - Requires flags in `about:config`

### No VR Headset?

Install the [Immersive Web Emulator](https://chromewebstore.google.com/detail/immersive-web-emulator/cgffilbpcibhmcfbgggfhfolhkfbhmik) Chrome extension.

### Entering VR
1. Load a dataset
2. Click **Enter VR** button
3. Put on headset
4. Use controllers to interact

---

## Troubleshooting

### Docker Issues

```bash
# Check service status
docker-compose ps

# View logs
docker-compose logs -f
docker-compose logs api -f  # Specific service

# Restart services
docker-compose restart

# Full reset (loses data)
docker-compose down -v
./scripts/start.sh
```

### Port Conflicts

```bash
# Find process using a port
lsof -i :3001

# Kill it
kill -9 <PID>
```

### Database Reset

```bash
./scripts/reset-database.sh
```

### SSL Certificate Issues

Regenerate certificates:
```bash
rm -rf certs
mkdir certs
openssl req -x509 -newkey rsa:4096 \
  -keyout certs/key.pem \
  -out certs/cert.pem \
  -days 365 -nodes \
  -subj "/CN=localhost"
```

### API Health Check

```bash
curl http://localhost:3001/api/health
```

---

## Documentation

See the [docs/](./docs/) folder:

- [Architecture](./docs/ARCHITECTURE.md) - System design
- [Development Guide](./docs/DEVELOPMENT.md) - Dev workflow
- [Component Style Guide](./docs/COMPONENT_STYLE_GUIDE.md) - UI components
- [Contributor Guide](./docs/guides/CONTRIBUTOR_GUIDE.md) - Contributing

---

## Production Deployment

Before deploying to production:

1. **Use strong passwords** in `.env`
2. **Use real SSL certificates** (Let's Encrypt)
3. **Configure Keycloak** properly
4. **Set `NODE_ENV=production`**
5. **Configure CORS** to your domain
6. **Use managed PostgreSQL** (RDS, Cloud SQL, etc.)
7. **Use S3** instead of MinIO (or managed MinIO)

See [docker-compose.yml](./docker-compose.yml) for service configuration.

---

## License

[License information here]

---

## Acknowledgments

- [VTK.js](https://kitware.github.io/vtk-js/) by Kitware
- [Y.js](https://yjs.dev/) by Kevin Jahns
- [LiveKit](https://livekit.io/) for WebRTC
- [React](https://react.dev/) by Meta
