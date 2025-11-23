FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy server code
COPY server ./server

# Expose API port
EXPOSE 3001

# Start the API server
CMD ["node", "server/src/index.js"]