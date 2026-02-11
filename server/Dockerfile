FROM node:18-alpine

WORKDIR /app

# Install server dependencies first for better caching
COPY server/package*.json ./server/
RUN cd server && npm install --production=false

# Copy server code
COPY server ./server

# Expose API port
EXPOSE 3001

# Start the API server
CMD ["node", "server/src/index.js"]
