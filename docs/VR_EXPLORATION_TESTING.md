# VR Exploration Testing Guide

This guide covers end-to-end testing of the VR exploration feature.

## Prerequisites

1. **Database Setup**
   - For new databases: Tables are created automatically via `init.sql`
   - For existing databases: Run the migration script:
     ```bash
     cd server/database
     ./run-migration.sh migrations/009_add_vr_exploration_tables.sql
     ```

2. **Redis Setup** (for preprocessing queue)
   ```bash
   # Start Redis (macOS with Homebrew)
   brew services start redis

   # Or via Docker
   docker run -d -p 6379:6379 redis
   ```

3. **Server Running**
   ```bash
   cd server && npm run dev
   ```

4. **Client Running**
   ```bash
   npm run dev
   ```

## Testing Flows

### 1. Basic VR Session Creation

1. Open a project with a 3D dataset loaded
2. Click the VR button in the view header or instance toolbar
3. The VR Launch Modal should appear with options:
   - Selection type (Full, Region, Selection)
   - Exploration mode (Fly, Teleport)
   - Scale settings
   - Collaboration options
4. Click "Start VR Session"
5. Verify:
   - Session is created in database (`vr_exploration_sessions` table)
   - VR Session panel opens automatically
   - WebSocket broadcasts `vr:session-created` to other clients

### 2. Session Joining

1. Have another browser tab/user open the same project
2. They should see the active session in the VR button indicator
3. Click to join the session
4. Verify:
   - Participant added to `vr_session_participants` table
   - WebSocket broadcasts `vr:participant-joined`
   - VR Session panel shows both participants

### 3. Session Management

**Leave Session:**
1. Click "Leave Session" in VR panel
2. Verify participant is removed, others notified

**End Session (Owner only):**
1. Owner clicks "End Session"
2. Verify:
   - Session status changes to 'ended'
   - All participants notified via WebSocket
   - VR Session panel closes

### 4. Snapshots

1. During active session, click "Create Snapshot"
2. Enter snapshot name
3. Verify:
   - Snapshot created in `vr_session_snapshots` table
   - WebSocket broadcasts `vr:snapshot-created`

### 5. Preprocessing Flow (Large Datasets)

For datasets exceeding thresholds:
- Points: > 1M (medium), > 10M (high)
- Polygons: > 500K (medium), > 5M (high)

1. Load a large dataset
2. Click VR button
3. System should:
   - Check preprocessing status via `/api/vr/preprocessing/:datasetId/ready`
   - If needed, show preprocessing UI
   - Start preprocessing via `/api/vr/preprocessing/:datasetId/start`
4. Monitor progress via WebSocket events:
   - `vr:preprocessing-started`
   - `vr:preprocessing-progress`
   - `vr:preprocessing-complete` or `vr:preprocessing-failed`

**Note:** Full preprocessing requires a Python worker consuming from the `vr-preprocessing` BullMQ queue.

### 6. Running the VR Preprocessing Worker

```bash
cd workers/vr-preprocessing

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows

# Install dependencies
pip install -r requirements.txt

# Set environment variables
export REDIS_HOST=localhost
export MINIO_ENDPOINT=localhost:9000
export API_BASE_URL=http://localhost:3001/api/vr/preprocessing/internal

# Run worker
python worker.py
```

Or with Docker:
```bash
cd workers/vr-preprocessing
docker build -t cia-vr-preprocessing-worker .
docker run -d \
  --name vr-worker \
  -e REDIS_HOST=host.docker.internal \
  -e MINIO_ENDPOINT=host.docker.internal:9000 \
  -e API_BASE_URL=http://host.docker.internal:3001/api/vr/preprocessing/internal \
  cia-vr-preprocessing-worker
```

## API Endpoints Reference

### Sessions
- `POST /api/vr/sessions` - Create session
- `GET /api/vr/sessions` - List active sessions
- `GET /api/vr/sessions/:id` - Get session details
- `PUT /api/vr/sessions/:id` - Update session
- `DELETE /api/vr/sessions/:id` - End session

### Participants
- `POST /api/vr/sessions/:id/join` - Join session
- `POST /api/vr/sessions/:id/leave` - Leave session

### Snapshots
- `POST /api/vr/sessions/:id/snapshots` - Create snapshot
- `GET /api/vr/sessions/:id/snapshots` - List snapshots

### Preprocessing
- `GET /api/vr/preprocessing/:datasetId/status` - Get status
- `GET /api/vr/preprocessing/:datasetId/ready` - Check readiness
- `POST /api/vr/preprocessing/:datasetId/start` - Start preprocessing

## WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `vr:session-created` | Server→Client | New session started |
| `vr:session-updated` | Server→Client | Session settings changed |
| `vr:session-ended` | Server→Client | Session terminated |
| `vr:participant-joined` | Server→Client | User joined session |
| `vr:participant-left` | Server→Client | User left session |
| `vr:snapshot-created` | Server→Client | Snapshot captured |
| `vr:preprocessing-started` | Server→Client | Preprocessing queued |
| `vr:preprocessing-progress` | Server→Client | Progress update |
| `vr:preprocessing-complete` | Server→Client | Ready for VR |
| `vr:preprocessing-failed` | Server→Client | Preprocessing error |

## Database Tables

- `vr_exploration_sessions` - Session metadata
- `vr_session_participants` - Who's in each session
- `vr_session_snapshots` - Captured states
- `vr_preprocessing` - Preprocessing job tracking

## Troubleshooting

**VR button not showing:**
- Check that dataset is loaded and has 3D geometry
- Verify VR support in browser (`navigator.xr`)

**Session not broadcasting:**
- Check WebSocket connection in browser dev tools
- Verify client joined project room via `join:project` message

**Preprocessing stuck:**
- Check Redis is running: `redis-cli ping`
- Verify BullMQ queue: check server logs for queue creation
- Note: Actual preprocessing requires Python worker (not implemented)

## Files Reference

### Server
- `server/src/routes/vr.js` - API routes
- `server/src/services/vrPreprocessing.js` - Preprocessing service
- `server/src/services/websocket.js` - WebSocket events

### Client
- `src/ui/react/hooks/useVRSession.js` - Session hook
- `src/ui/react/hooks/useVRPreprocessing.js` - Preprocessing hook
- `src/ui/react/components/molecules/VRExploreButton/` - VR button
- `src/ui/react/components/panels/VRSessionPanel/` - Session panel
- `src/ui/react/components/modals/VRLaunchModal/` - Launch modal
