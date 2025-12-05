#!/bin/bash
# start-livekit.sh - Start LiveKit voice chat services
#
# This script starts:
# 1. LiveKit server (Docker container) - WebRTC SFU for voice
# 2. Token server (Node.js) - Generates access tokens for clients

set -e

# Colors
GREEN="$(echo -e '\033[0;32m')"
YELLOW="$(echo -e '\033[1;33m')"
RED="$(echo -e '\033[0;31m')"
NC="$(echo -e '\033[0m')"

print_status() { echo -e "${GREEN}✓${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }

echo ""
echo "🎙️  Starting LiveKit Voice Services..."
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

# LiveKit configuration
# Using LiveKit's dev mode keys (safe for local development only!)
LIVEKIT_API_KEY="${LIVEKIT_API_KEY:-devkey}"
LIVEKIT_API_SECRET="${LIVEKIT_API_SECRET:-secret}"

# Check if LiveKit container already exists
if docker ps -a --format '{{.Names}}' | grep -q '^cia-livekit$'; then
    if docker ps --format '{{.Names}}' | grep -q '^cia-livekit$'; then
        print_warning "LiveKit container already running"
    else
        echo "Starting existing LiveKit container..."
        docker start cia-livekit
    fi
else
    echo "Creating and starting LiveKit container..."
    docker run -d \
        --name cia-livekit \
        -p 7880:7880 \
        -p 7881:7881 \
        -p 7882:7882/udp \
        -e LIVEKIT_KEYS="${LIVEKIT_API_KEY}: ${LIVEKIT_API_SECRET}" \
        livekit/livekit-server:latest \
        --dev \
        --bind 0.0.0.0
fi

# Wait for LiveKit to be ready
echo -n "Waiting for LiveKit server... "
MAX_RETRIES=30
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -s http://localhost:7880 > /dev/null 2>&1; then
        print_status "Ready"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
        print_error "LiveKit failed to start. Check logs: docker logs cia-livekit"
        exit 1
    fi
    sleep 1
done

# Start token server in background
echo "Starting token server..."

# Check if token server is already running
if lsof -i :3002 > /dev/null 2>&1; then
    print_warning "Token server already running on port 3002"
else
    # Navigate to project root and start token server
    cd "$(dirname "$0")/.."

    # Export LiveKit credentials for token server
    export LIVEKIT_API_KEY
    export LIVEKIT_API_SECRET

    # Start token server in background with nohup
    nohup node token-server.js > /tmp/cia-token-server.log 2>&1 &
    TOKEN_PID=$!

    # Save PID for stop script
    echo $TOKEN_PID > /tmp/cia-token-server.pid

    sleep 2

    if lsof -i :3002 > /dev/null 2>&1; then
        print_status "Token server started (PID: $TOKEN_PID)"
    else
        print_error "Token server failed to start. Check /tmp/cia-token-server.log"
        exit 1
    fi
fi

echo ""
print_status "LiveKit voice services are running!"
echo ""
echo "🎙️  Voice Services:"
echo "  • LiveKit Server:  ws://localhost:7880"
echo "  • Token Server:    http://localhost:3002"
echo ""
echo "📝 Token server logs: tail -f /tmp/cia-token-server.log"
echo ""