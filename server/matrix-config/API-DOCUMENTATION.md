# Matrix Federation API Documentation

**Version**: 1.0
**Base URL**: `/api/matrix`
**Authentication**: JWT Bearer token (same as CIA Web API)

---

## Table of Contents

1. [Authentication](#authentication)
2. [Federation Status](#federation-status)
3. [Federated Users](#federated-users)
4. [Room Directory](#room-directory)
5. [Room Management](#room-management)
6. [Error Codes](#error-codes)
7. [Rate Limits](#rate-limits)
8. [Webhooks](#webhooks)

---

## Authentication

All Matrix API endpoints require authentication using the same JWT token as the main CIA Web API.

**Header Format**:
```http
Authorization: Bearer <jwt_token>
```

**User ID Extraction**:
The user ID is extracted from the JWT token's `sub` claim or custom user identifier field.

---

## Federation Status

### GET /api/matrix/status

Get the current status of the Matrix federation bridge.

**Response** (200 OK):
```json
{
  "enabled": true,
  "initialized": true,
  "connected": true,
  "userId": "@cia_bridge:matrix.cia-web.local",
  "homeserver": "http://localhost:8008",
  "roomMappings": 12,
  "processedEvents": 1543,
  "circuitBreaker": {
    "state": "CLOSED",
    "failureCount": 0,
    "lastStateChange": "2026-01-13T10:00:00.000Z"
  },
  "retryQueue": {
    "size": 0,
    "oldestItem": null
  },
  "lastHealthCheck": {
    "timestamp": 1705145123456,
    "status": "healthy",
    "connected": true
  },
  "reconnectAttempts": 0
}
```

**Circuit Breaker States**:
- `CLOSED`: Normal operation
- `OPEN`: Too many failures, failing fast
- `HALF_OPEN`: Testing recovery

**Example Usage**:
```bash
curl http://localhost:3000/api/matrix/status \
  -H "Authorization: Bearer $JWT_TOKEN"
```

---

## Federated Users

### GET /api/matrix/users/room/:roomId

Get list of federated Matrix users in a specific CIA Web room.

**Parameters**:
- `roomId` (path): CIA Web room UUID

**Response** (200 OK):
```json
{
  "federatedUsers": [
    {
      "matrixUserId": "@alice:external.org",
      "displayName": "Alice Smith",
      "avatarUrl": "https://external.org/_matrix/media/...",
      "serverName": "external.org",
      "lastSeen": "2026-01-13T09:45:00.000Z",
      "status": "active"
    },
    {
      "matrixUserId": "@bob:another-server.com",
      "displayName": "Bob Jones",
      "avatarUrl": null,
      "serverName": "another-server.com",
      "lastSeen": "2026-01-13T09:30:00.000Z",
      "status": "active"
    }
  ],
  "total": 2
}
```

**Status Values**:
- `active`: Currently participating
- `inactive`: Left the room
- `banned`: Banned from room

**Example**:
```bash
curl http://localhost:3000/api/matrix/users/room/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer $JWT_TOKEN"
```

---

### GET /api/matrix/users/:matrixUserId

Get details for a specific federated Matrix user.

**Parameters**:
- `matrixUserId` (path): Matrix user ID (e.g., `@user:server.org`)

**Response** (200 OK):
```json
{
  "matrixUserId": "@alice:external.org",
  "displayName": "Alice Smith",
  "avatarUrl": "https://external.org/_matrix/media/...",
  "serverName": "external.org",
  "lastSeen": "2026-01-13T09:45:00.000Z",
  "cachedAt": "2026-01-13T08:00:00.000Z",
  "status": "active",
  "profileData": {}
}
```

**Error Responses**:
- `404 Not Found`: User not in cache

**Example**:
```bash
curl "http://localhost:3000/api/matrix/users/%40alice%3Aexternal.org" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

---

### GET /api/matrix/rooms/:roomId/members

Get all members (local and federated) for a Matrix room.

**Parameters**:
- `roomId` (path): CIA Web room UUID

**Response** (200 OK):
```json
{
  "members": [
    {
      "userId": "@cia_user_123:matrix.cia-web.local",
      "displayName": "John Doe",
      "avatarUrl": null,
      "membership": "join",
      "powerLevel": 100,
      "isFederated": false
    },
    {
      "userId": "@alice:external.org",
      "displayName": "Alice Smith",
      "avatarUrl": "https://external.org/_matrix/media/...",
      "membership": "join",
      "powerLevel": 0,
      "isFederated": true
    }
  ],
  "total": 2,
  "matrixRoomId": "!abc123:matrix.cia-web.local"
}
```

**Membership Values**:
- `join`: Active member
- `invite`: Invited but not yet joined
- `leave`: Left the room
- `ban`: Banned from room

**Example**:
```bash
curl http://localhost:3000/api/matrix/rooms/550e8400-e29b-41d4-a716-446655440000/members \
  -H "Authorization: Bearer $JWT_TOKEN"
```

---

### GET /api/matrix/avatar/:matrixUserId

Proxy/redirect to a Matrix user's avatar image.

**Parameters**:
- `matrixUserId` (path): Matrix user ID (URL-encoded)

**Response**:
- `302 Redirect`: Redirects to avatar URL
- `404 Not Found`: Avatar not available

**Usage in HTML**:
```html
<img src="/api/matrix/avatar/@alice:external.org" alt="Alice">
```

**Example**:
```bash
curl -L "http://localhost:3000/api/matrix/avatar/%40alice%3Aexternal.org" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

---

## Room Directory

### GET /api/matrix/directory/search

Search for public Matrix rooms in the room directory.

**Query Parameters**:
- `query` (optional): Search term
- `server` (optional): Filter by homeserver
- `limit` (optional): Max results (default: 20, max: 100)

**Rate Limit**: 1 request per 10 seconds per user

**Response** (200 OK):
```json
{
  "rooms": [
    {
      "roomId": "!abc123:matrix.org",
      "alias": "#public-room:matrix.org",
      "name": "Public Discussion Room",
      "topic": "General chat for Matrix users",
      "memberCount": 234,
      "avatarUrl": "https://matrix.org/_matrix/media/...",
      "isWorldReadable": true,
      "guestCanJoin": true
    }
  ],
  "total": 1,
  "nextBatch": null
}
```

**Error Responses**:
- `429 Too Many Requests`: Rate limit exceeded
- `503 Service Unavailable`: Matrix federation not available

**Example**:
```bash
curl "http://localhost:3000/api/matrix/directory/search?query=matrix&limit=10" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

---

### GET /api/matrix/directory/servers

Get list of known Matrix servers for filtering directory searches.

**Response** (200 OK):
```json
{
  "servers": [
    {
      "name": "matrix.org",
      "description": "Official Matrix.org homeserver"
    },
    {
      "name": "mozilla.org",
      "description": "Mozilla Matrix homeserver"
    }
  ]
}
```

**Example**:
```bash
curl http://localhost:3000/api/matrix/directory/servers \
  -H "Authorization: Bearer $JWT_TOKEN"
```

---

## Room Management

### POST /api/matrix/rooms/join

Join an external Matrix room and create a CIA Web room mapping.

**Rate Limit**: 1 request per minute per user

**Request Body**:
```json
{
  "roomIdOrAlias": "#public-room:matrix.org",
  "projectId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Parameters**:
- `roomIdOrAlias`: Matrix room ID (`!abc:server`) or alias (`#name:server`)
- `projectId`: CIA Web project UUID to attach room to

**Response** (201 Created):
```json
{
  "ciaRoom": {
    "id": "660e8400-e29b-41d4-a716-446655440000",
    "project_id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Public Discussion Room",
    "description": "General chat for Matrix users",
    "room_type": "breakout",
    "is_public": true,
    "created_by": "770e8400-e29b-41d4-a716-446655440000",
    "created_at": "2026-01-13T10:00:00.000Z"
  },
  "matrixRoomId": "!abc123:matrix.org",
  "matrixAlias": "#public-room:matrix.org",
  "message": "Successfully joined Matrix room and created mapping"
}
```

**Error Responses**:
- `400 Bad Request`: Missing required fields
- `403 Forbidden`: Not allowed to join room
- `404 Not Found`: Room not found
- `429 Too Many Requests`: Rate limit exceeded
- `503 Service Unavailable`: Matrix federation not available

**Example**:
```bash
curl -X POST http://localhost:3000/api/matrix/rooms/join \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "roomIdOrAlias": "#test:matrix.org",
    "projectId": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

---

### GET /api/matrix/rooms/:roomId/info

Get Matrix room information for a CIA Web room.

**Parameters**:
- `roomId` (path): CIA Web room UUID

**Response** (200 OK):
```json
{
  "ciaRoomId": "550e8400-e29b-41d4-a716-446655440000",
  "matrixRoomId": "!abc123:matrix.cia-web.local",
  "matrixAlias": "#cia_room-main:matrix.cia-web.local",
  "status": "active",
  "createdAt": "2026-01-13T08:00:00.000Z",
  "name": "Main Room",
  "topic": "Project main discussion room",
  "memberCount": 5,
  "canJoin": true
}
```

**Error Responses**:
- `404 Not Found`: Matrix room mapping not found
- `503 Service Unavailable`: Matrix federation not available

**Example**:
```bash
curl http://localhost:3000/api/matrix/rooms/550e8400-e29b-41d4-a716-446655440000/info \
  -H "Authorization: Bearer $JWT_TOKEN"
```

---

## Error Codes

### Standard HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 302 | Redirect | Redirecting to external resource |
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Not allowed to perform action |
| 404 | Not Found | Resource not found |
| 429 | Too Many Requests | Rate limit exceeded |
| 503 | Service Unavailable | Matrix federation unavailable |

### Matrix-Specific Error Codes

Returned in response body as `{ "error": "CODE", "message": "..." }`:

| Code | Description |
|------|-------------|
| `M_FORBIDDEN` | Not allowed to join/access room |
| `M_NOT_FOUND` | Matrix room not found |
| `M_UNKNOWN` | Unknown Matrix error |
| `CIRCUIT_OPEN` | Circuit breaker is open (Matrix unavailable) |

### Error Response Format

```json
{
  "error": "Rate limit exceeded",
  "message": "Please wait before searching again",
  "code": 429,
  "timestamp": "2026-01-13T10:00:00.000Z"
}
```

---

## Rate Limits

Rate limits are enforced per-user to prevent abuse.

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/directory/search` | 1 request | 10 seconds |
| `/rooms/join` | 1 request | 60 seconds |
| All other endpoints | No limit | - |

**Rate Limit Headers** (future):
```http
X-RateLimit-Limit: 1
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1705145123
```

**Rate Limit Response**:
```json
{
  "error": "Rate limit exceeded",
  "message": "Please wait before searching again"
}
```

---

## Webhooks

### Federation Events (Future Feature)

Subscribe to federation events via webhooks:

**Event Types**:
- `federation.user.joined` - Federated user joined room
- `federation.user.left` - Federated user left room
- `federation.message.received` - Message from Matrix
- `federation.connection.lost` - Lost connection to Matrix
- `federation.connection.restored` - Reconnected to Matrix

**Webhook Payload**:
```json
{
  "event": "federation.user.joined",
  "timestamp": "2026-01-13T10:00:00.000Z",
  "data": {
    "roomId": "550e8400-e29b-41d4-a716-446655440000",
    "matrixUserId": "@alice:external.org",
    "displayName": "Alice Smith"
  }
}
```

---

## Usage Examples

### Complete Integration Flow

```javascript
// 1. Check federation status
const status = await fetch('/api/matrix/status', {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json());

if (!status.connected) {
  console.log('Federation unavailable');
  return;
}

// 2. Search for rooms
const searchResults = await fetch('/api/matrix/directory/search?query=matrix', {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json());

// 3. Join a room
const room = searchResults.rooms[0];
const joined = await fetch('/api/matrix/rooms/join', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    roomIdOrAlias: room.alias,
    projectId: currentProjectId
  })
}).then(r => r.json());

// 4. Get federated users
const users = await fetch(`/api/matrix/users/room/${joined.ciaRoom.id}`, {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json());

console.log('Federated users:', users.federatedUsers);
```

---

## SDK Integration (Future)

```javascript
import { MatrixFederationClient } from 'cia-web-sdk';

const client = new MatrixFederationClient({
  baseUrl: 'http://localhost:3000',
  token: jwtToken
});

// Check status
const status = await client.getStatus();

// Search rooms
const rooms = await client.searchDirectory({ query: 'matrix', limit: 10 });

// Join room
const room = await client.joinRoom(rooms[0].alias, projectId);

// Get federated users
const users = await client.getFederatedUsers(room.id);
```

---

## Security Considerations

### Authentication
- All endpoints require valid JWT token
- Tokens expire based on CIA Web session configuration
- No anonymous access to federation features

### Rate Limiting
- Prevents abuse and DoS attacks
- Limits enforced per authenticated user
- Stricter limits for expensive operations

### Data Privacy
- Federated user data cached with 30-day TTL
- Avatar URLs proxied through CIA Web
- No sensitive data exposed in error messages

### Matrix Protocol Security
- Uses application service authentication (AS token)
- Bridge bot has admin permissions in created rooms
- End-to-end encryption support (future phase)

---

## Monitoring & Observability

### Health Check Endpoint

Use `/api/matrix/status` for:
- Service health monitoring
- Circuit breaker state tracking
- Retry queue size monitoring
- Connection status verification

### Recommended Alerts

1. **Circuit Breaker Open**: Alert when `circuitBreaker.state === "OPEN"`
2. **Large Retry Queue**: Alert when `retryQueue.size > 50`
3. **Connection Lost**: Alert when `connected === false`
4. **High Reconnect Attempts**: Alert when `reconnectAttempts > 5`

### Metrics to Track

- Federation uptime percentage
- Message sync latency
- Room creation success rate
- User join/leave events per hour
- Rate limit hit rate

---

## Changelog

### v1.0.0 (2026-01-13)
- Initial API documentation
- All Phase 1-8 endpoints documented
- Rate limiting specifications
- Error codes and responses
- Integration examples

---

## Support

For issues or questions:
- GitHub: https://github.com/cia-web/matrix-federation
- Documentation: https://docs.cia-web.local/federation
- Admin Guide: See `DEPLOYMENT-GUIDE.md`
- Troubleshooting: See `TROUBLESHOOTING.md`
