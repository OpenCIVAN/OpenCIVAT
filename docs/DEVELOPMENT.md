# CIA Web Development Guide

## Architecture Overview

CIA Web now uses a full-stack architecture with:

### Backend Services (Docker)
- **PostgreSQL** - Database for projects, files, users, annotations
- **MinIO** - Object storage for file uploads
- **Express API** - REST API for file management

### Frontend Services
- **WebSocket Server** (port 9001) - Y.js collaboration
- **Webpack Dev Server** (port 8080) - React frontend

---

## Quick Start

### First Time Setup

```bash
# 1. Start backend services
./scripts/start.sh

# 2. Start frontend (in separate terminal)
npm start
```

The frontend will open automatically at `http://localhost:8080`

---

## Development Scripts

See `scripts/README.md` for full documentation.

### `./scripts/start.sh`
Starts all Docker services (PostgreSQL, MinIO, API, Matrix, etc.)
- Checks Docker is running
- Starts containers
- Waits for health checks

### `./scripts/stop.sh`
Stops all Docker services
- Keeps data volumes intact
- Use `--clean` flag to also remove volumes

### `./restart.sh`
Restarts Docker services without losing data

---

## Manual Control

### Backend Services

```bash
# Start
docker-compose up -d

# Stop
docker-compose down

# View logs
docker-compose logs -f
docker-compose logs api -f    # Just API logs
docker-compose logs postgres -f

# Restart single service
docker-compose restart api
```

### Frontend Services

```bash
# WebSocket server (Terminal 1)
npm run websocket

# Webpack dev server (Terminal 2)
npm start
```

---

## Service URLs

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend | http://localhost:8080 | React application |
| API | http://localhost:3001 | REST API |
| MinIO Console | http://localhost:9002 | File storage admin (minioadmin/minioadmin) |
| PostgreSQL | localhost:5432 | Database (cia_admin/cia_password) |
| WebSocket | ws://localhost:9001 | Y.js collaboration |

---

## Database Access

```bash
# Connect to database
docker exec -it cia-postgres psql -U cia_admin -d cia_analytics

# List tables
\dt

# Query projects
SELECT * FROM projects;

# Query files
SELECT filename, file_type FROM datasets;

# Exit
\q
```

---

## Common Tasks

### Reset Database
```bash
docker-compose down -v  # Removes volumes
docker-compose up -d    # Recreates with fresh migrations
```

### View API Logs
```bash
docker-compose logs api -f
```

### Test API Endpoints
```bash
# Health check
curl http://localhost:3001/api/health

# List projects
curl http://localhost:3001/api/projects

# List files in demo project
curl http://localhost:3001/api/projects/00000000-0000-0000-0000-000000000001/files
```

### Clear Frontend Cache
```javascript
// In browser console
localStorage.clear()
// Then hard reload: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows/Linux)
```

---

## Troubleshooting

### Port Conflicts
If ports are already in use:
- PostgreSQL: 5432
- API: 3001
- MinIO: 9000, 9002
- WebSocket: 9001
- Frontend: 8080

Find and kill processes:
```bash
lsof -i :3001  # Find process on port 3001
kill -9 <PID>  # Kill it
```

### API Won't Start
```bash
# Check logs
docker-compose logs api

# Rebuild
docker-compose build api
docker-compose up -d api
```

### Database Connection Issues
```bash
# Check if PostgreSQL is healthy
docker-compose ps

# View logs
docker-compose logs postgres

# Restart
docker-compose restart postgres
```

### MinIO Connection Issues
```bash
# Check bucket exists
docker exec -it cia-api node -e "
const Minio = require('minio');
const client = new Minio.Client({
  endPoint: 'minio',
  port: 9000,
  useSSL: false,
  accessKey: 'minioadmin',
  secretKey: 'minioadmin'
});
client.bucketExists('cia-files').then(console.log);
"
```

---

## File Upload Flow

1. User uploads file via FilesPanel
2. Frontend sends to `/api/projects/{id}/files`
3. API calculates SHA-256 hash
4. API checks if file exists (deduplication)
5. If new: Upload to MinIO + Insert into `datasets` table
6. If exists: Reuse existing file
7. Add entry to `file_project_access` junction table
8. Return file metadata to frontend

---

## Database Schema

### Core Tables
- `organizations` - Tenants/companies
- `users` - User accounts
- `projects` - Workspaces (rooms)
- `datasets` - Physical files (Layer 1)
- `view_configurations` - Visualization snapshots (Layer 2)
- `annotations` - Linked to datasets
- `file_project_access` - Junction for file-project access

### Audit
- `audit_log` - All file/project operations

---

## Contributing

1. Create a feature branch
2. Make changes
3. Test locally with `./scripts/start.sh` and `npm start`
4. Run tests: `npm test` (when implemented)
5. Build: `npm run build`
6. Commit and push
7. Create pull request

---

## Production Deployment

See `docker-compose.yml` for production configuration.

Environment variables to set:
- `NODE_ENV=production`
- `DB_PASSWORD` - Strong password
- `MINIO_ACCESS_KEY` - Strong access key
- `MINIO_SECRET_KEY` - Strong secret key
- API authentication tokens (when implemented)
