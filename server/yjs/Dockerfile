FROM node:18-alpine

WORKDIR /app

# Copy the Y.js relay server (from repo root)
COPY server.js ./server.js

# Copy the logger with its directory structure
# server.js requires("./server/src/utils/logger")
COPY server/src/utils/logger.js ./server/src/utils/logger.js

# Install only ws (the Y.js relay's only dependency)
RUN npm init -y && npm install ws

# Health check support
RUN apk add --no-cache netcat-openbsd

EXPOSE 9001

CMD ["node", "server.js"]