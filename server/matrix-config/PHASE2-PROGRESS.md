# Phase 2: Bridge Service Core - IN PROGRESS 🚧

**Started**: January 12, 2026

## Overview

Creating the Matrix bridge service to enable bidirectional message sync between CIA Web's Y.js chat system and Matrix Protocol federation.

## Architecture

```
CIA Web Client (Y.js)
    ↓
Y.js WebSocket Server
    ↓ (hook)
Matrix Bridge Service ← → Synapse Homeserver
    ↓
PostgreSQL (Source of Truth)
```

**Key Principles**:
- Server-authoritative: PostgreSQL is always source of truth
- Y.js for local: Sub-second latency for room participants
- Matrix for federation: Cross-server communication
- Deduplication: Prevents infinite message loops
- Graceful degradation: Works if Matrix temporarily unavailable

## Progress

### ✅ Completed

1. **Matrix JS SDK Installation**
   - Installed `matrix-js-sdk` package
   - Version: Latest from npm (18 dependencies)

2. **Matrix Bridge Service** (`server/src/services/matrixBridge.js`)
   - **524 lines** of production-ready code
   - Matrix client initialization with app service credentials
   - Event listeners for sync state, incoming messages, room membership
   - Room mapping system (CIA room ID ↔ Matrix room ID)
   - Deduplication system with 30-minute TTL
   - Outbound sync: `syncToMatrix(message)` - sends CIA messages to Matrix
   - Inbound sync: Handles Matrix events and stores in PostgreSQL
   - Matrix room creation: `createOrGetMatrixRoom()`
   - Status reporting: `getStatus()` for health checks
   - Graceful shutdown with cleanup

   **Key Features**:
   - Checks `federation_source` metadata to avoid loops
   - Marks processed events to prevent duplicate handling
   - Formats messages with sender name for context
   - Configurable via environment variables
   - Can be disabled without breaking server

3. **Matrix User Resolver** (`server/src/services/matrixUserResolver.js`)
   - **270 lines** of code
   - Resolves Matrix user IDs to display names and avatars
   - In-memory cache with 15-minute TTL
   - Batch resolution for multiple users
   - Room-specific display names (if available)
   - Avatar URL conversion (Matrix mxc:// → HTTP)
   - Fallback profiles when API fails
   - Preload room members functionality
   - Cache cleanup timer
   - Database storage stubs (ready for Phase 3)

4. **Server Integration** (`server/src/index.js`)
   - Imported Matrix bridge and user resolver
   - Initialized Matrix bridge after other services
   - Made bridge available via `app.locals.matrixBridge`
   - Made user resolver available via `app.locals.matrixUserResolver`
   - Added Matrix status to `/api/health` endpoint
   - Added Matrix bridge shutdown to graceful shutdown
   - Async initialization (doesn't block server startup)
   - Fallback mode if Matrix initialization fails

### 🚧 In Progress

5. **Testing & Verification**
   - Server starts correctly with Matrix disabled
   - Matrix bridge logs show proper initialization
   - Health endpoint includes Matrix status

### ⏳ Remaining (Phase 2)

6. **Y.js Persistence Hook**
   - Modify `yjsPersistence.storeChatMessage()` to call Matrix bridge
   - Hook: After storing message in PostgreSQL, call `matrixBridge.syncToMatrix()`
   - Only sync if federation is enabled and connected

7. **Bidirectional Message Flow Testing**
   - Test CIA Web → Matrix: Send message in CIA Web, verify in Element
   - Test Matrix → CIA Web: Send message in Element, verify in CIA Web
   - Verify no duplicate messages
   - Test federated user attribution

8. **Error Handling & Edge Cases**
   - Test Matrix unavailable scenarios
   - Test room mapping failures
   - Test user resolution failures
   - Verify graceful degradation

## Files Created

```
server/
├── src/
│   ├── services/
│   │   ├── matrixBridge.js           (524 lines) ✅ NEW
│   │   └── matrixUserResolver.js     (270 lines) ✅ NEW
│   └── index.js                       (modified) ✅
├── package.json                       (modified) ✅
└── .env                               (has Matrix config) ✅
```

## Configuration

### Environment Variables

Matrix bridge reads from `.env`:

```bash
# Enable/disable federation
MATRIX_FEDERATION_ENABLED=true

# Synapse homeserver URL
MATRIX_BASE_URL=http://localhost:8008

# Server name for user IDs
MATRIX_SERVER_NAME=matrix.cia-web.local

# Application service tokens
MATRIX_AS_TOKEN=<token>
MATRIX_HS_TOKEN=<token>
```

### Bridge Initialization

```javascript
const matrixBridge = createMatrixBridge({
  enabled: process.env.MATRIX_FEDERATION_ENABLED === 'true',
  homeserverUrl: process.env.MATRIX_BASE_URL,
  serverName: process.env.MATRIX_SERVER_NAME,
  asToken: process.env.MATRIX_AS_TOKEN,
  hsToken: process.env.MATRIX_HS_TOKEN,
  senderLocalpart: 'cia_bridge',
});
```

## API

### Matrix Bridge Methods

```javascript
// Initialize bridge
await matrixBridge.initialize(yjsPersistence, pool);

// Sync CIA message to Matrix
const eventId = await matrixBridge.syncToMatrix(message);

// Create/get Matrix room for CIA room
const matrixRoomId = await matrixBridge.createOrGetMatrixRoom(
  ciaRoomId,
  { name: 'Room Name', topic: 'Topic' }
);

// Get bridge status
const status = matrixBridge.getStatus();
// {
//   enabled: true,
//   initialized: true,
//   connected: true,
//   userId: '@cia_bridge:matrix.cia-web.local',
//   homeserver: 'http://localhost:8008',
//   roomMappings: 2,
//   processedEvents: 15
// }

// Shutdown
await matrixBridge.shutdown();
```

### Matrix User Resolver Methods

```javascript
// Resolve single user
const profile = await matrixUserResolver.resolveUser(
  '@user:server.org',
  roomId // optional, for room-specific display name
);
// {
//   matrixUserId: '@user:server.org',
//   displayName: 'User Name',
//   avatarUrl: 'http://...',
//   serverName: 'server.org',
//   isFederated: true,
//   lastSeen: Date
// }

// Resolve multiple users
const profiles = await matrixUserResolver.resolveUsers([
  '@user1:server.org',
  '@user2:server.org'
], roomId);

// Preload room members
const count = await matrixUserResolver.preloadRoomMembers(matrixRoomId);

// Cache management
matrixUserResolver.invalidateCache('@user:server.org');
matrixUserResolver.clearCache();

const stats = matrixUserResolver.getCacheStats();
// { size: 42, ttl: 900000 }
```

## Health Endpoint

The `/api/health` endpoint now includes Matrix status:

```json
{
  "status": "healthy",
  "version": "2.0.0",
  "services": {
    "database": "connected",
    "websocket": { "connected": true, "clients": 5 },
    "matrix": {
      "enabled": true,
      "initialized": true,
      "connected": true,
      "userId": "@cia_bridge:matrix.cia-web.local",
      "homeserver": "http://localhost:8008",
      "roomMappings": 2,
      "processedEvents": 15
    }
  }
}
```

## Message Flow

### Outbound (CIA Web → Matrix)

1. User sends message in CIA Web
2. Y.js adds to Y.Array("chatMessages")
3. `yjsPersistence.storeChatMessage()` writes to PostgreSQL
4. **[NEXT STEP]** Call `matrixBridge.syncToMatrix(message)`
5. Bridge checks if message originated from Matrix (skip if yes)
6. Bridge gets Matrix room ID from mapping
7. Bridge sends `m.room.message` event to Synapse
8. Marks event ID as processed (deduplication)
9. **[Phase 3]** Store Matrix event ID in database

### Inbound (Matrix → CIA Web)

1. ✅ Matrix event arrives at bridge listener
2. ✅ Check deduplication (skip if already processed)
3. ✅ Resolve Matrix user (name, avatar)
4. ✅ Insert to PostgreSQL with `federation_source = 'matrix'`
5. ✅ Mark event as processed
6. **[NEXT STEP]** Notify Y.js clients via callback
7. **[NEXT STEP]** Clients fetch new message from REST API

## Deduplication Strategy

**Problem**: Prevent infinite loops (message bouncing between Y.js and Matrix)

**Solution**:
- ✅ **In-Memory Cache**: `processedEvents` Map with 30-min TTL
- ✅ **Metadata Check**: Skip messages with `federation_source = 'matrix'`
- ⏳ **Database Log**: `matrix_event_log` table (Phase 3)
- ⏳ **Event ID Storage**: Store `matrix_event_id` in `chat_messages` (Phase 3)

## Testing Plan

### Manual Testing

1. **Server Startup**
   ```bash
   cd server
   node src/index.js
   # Should log: "Matrix bridge initialized successfully"
   # Should log: "Matrix federation is active"
   ```

2. **Health Check**
   ```bash
   curl http://localhost:3000/api/health
   # Should show matrix.connected = true
   ```

3. **CIA Web → Matrix**
   - Send message in CIA Web chat
   - Open Element client
   - Join Matrix room (will be created automatically)
   - Verify message appears

4. **Matrix → CIA Web**
   - Send message in Element
   - Check CIA Web chat tab
   - Verify message appears with federated user badge

### Integration Testing

```bash
# Test deduplication
# Send 100 messages rapidly
# Verify no duplicates in either system

# Test offline resilience
# Stop Synapse container
# Send messages in CIA Web
# Start Synapse container
# Verify messages don't sync (expected behavior for Phase 2)
```

## Known Limitations (Phase 2)

1. **No Database Schema Yet**
   - Room mappings only in memory (lost on restart)
   - No persistent event log
   - No federated user cache in database
   - **Fix**: Phase 3 will add database tables

2. **No Retry Logic**
   - Failed outbound messages are dropped
   - No queue for offline scenarios
   - **Fix**: Phase 8 will add circuit breaker and retry

3. **No Y.js Integration Yet**
   - Inbound messages not broadcast to Y.js clients
   - Outbound hook not implemented
   - **Fix**: Remaining Phase 2 tasks

4. **No Room Auto-Creation**
   - Matrix rooms must be created manually via API
   - **Fix**: Phase 4 will auto-create on CIA room creation

## Next Steps

### Immediate (Complete Phase 2)

1. **Hook Y.js Persistence** (~30 lines)
   - Modify `yjsPersistence.storeChatMessage()`
   - Add `matrixBridge.syncToMatrix()` call after PostgreSQL insert
   - Pass message object with metadata

2. **Add Message Callback** (~20 lines)
   - Set `matrixBridge.onMessageFromMatrix` callback
   - Callback should notify WebSocket clients
   - Clients will fetch message via REST API

3. **Test End-to-End**
   - Create test room in CIA Web
   - Send message from CIA Web → verify in Element
   - Send message from Element → verify in CIA Web
   - Verify no duplicates
   - Test with multiple clients

### Phase 3: Database Schema

After completing Phase 2, proceed to Phase 3:
- Add `matrix_event_id`, `matrix_room_id` columns to `chat_messages`
- Create `matrix_room_mappings` table
- Create `matrix_event_log` table for deduplication
- Create `federated_user_cache` table
- Migration script: `010_matrix_federation.sql`

## Code Quality

- **TypeScript-style JSDoc**: All methods documented
- **Error Handling**: Try-catch blocks with proper logging
- **Resource Cleanup**: Graceful shutdown implemented
- **Logging**: Structured logging at appropriate levels
- **Configuration**: Environment-based, not hardcoded
- **Modularity**: Services can be used independently
- **Testing**: Designed for testability with dependency injection

## Performance Considerations

- **In-Memory Caching**: User profiles cached for 15 minutes
- **Event Deduplication**: O(1) lookup with Map
- **Async Operations**: Non-blocking initialization
- **Cache Cleanup**: Automatic cleanup every 5 minutes
- **Graceful Degradation**: Server works if Matrix unavailable

## Security

- **Token Protection**: Tokens in environment variables only
- **Input Validation**: Matrix user IDs validated
- **Error Suppression**: Errors logged but not exposed to clients
- **Namespace Isolation**: CIA Web users prefixed with `cia_`

---

**Phase 2 Status**: ~70% Complete
**Next Milestone**: Y.js persistence hook + bidirectional testing
**Blocked By**: None
**Estimated Completion**: 1-2 more tasks
