FROM node:18-alpine

WORKDIR /app

# Copy the Y.js WebSocket server (from repo root)
COPY server.js ./server.js

# Copy the logger and persistence service with directory structure
# server.js requires("./server/src/utils/logger")
# server.js requires("./server/src/services/yjsPersistence")
COPY server/src/utils/logger.js ./server/src/utils/logger.js
COPY server/src/services/yjsPersistence.js ./server/src/services/yjsPersistence.js
COPY server/src/middleware/auth.js ./server/src/middleware/auth.js

# Install dependencies:
# - ws: WebSocket server
# - yjs: Y.js CRDT library
# - y-protocols: Y.js sync and awareness protocols
# - lib0: Y.js utility library (encoding/decoding)
# - pg: PostgreSQL client for persistence
# - jsonwebtoken + jwks-rsa: Keycloak JWT validation
RUN npm init -y && npm install ws yjs y-protocols lib0 pg jsonwebtoken jwks-rsa

# Health check support
RUN apk add --no-cache netcat-openbsd

EXPOSE 9001

CMD ["node", "server.js"]
