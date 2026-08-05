FROM node:22-slim

WORKDIR /app

# Install only the API's locked production dependencies.
COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev

# Copy the API source and runtime manifests.
COPY server ./server

# Expose API port
EXPOSE 3001

HEALTHCHECK --interval=10s --timeout=5s --start-period=15s --retries=5 \
  CMD node -e "fetch('http://localhost:3001/api/health').then(r => { if (!r.ok) process.exit(1) }).catch(() => process.exit(1))"

# Start the API server
CMD ["node", "server/src/index.js"]
