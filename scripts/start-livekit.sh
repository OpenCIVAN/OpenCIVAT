#!/bin/bash
# start-livekit.sh - Start LiveKit voice chat services
#
# This script starts:
# 1. LiveKit server (native or Docker) - WebRTC SFU for voice
# 2. Token server (Node.js) - Generates access tokens for clients
#
# Native mode is preferred on Mac due to Docker networking limitations.

set -e

# Colors
GREEN="$(echo -e '\033[0;32m')"
YELLOW="$(echo -e '\033[1;33m')"
RED="$(echo -e '\033[0;31m')"
CYAN="$(echo -e '\033[0;36m')"
NC="$(echo -e '\033[0m')"

print_status() { echo -e "${GREEN}✓${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }
print_info() { echo -e "${CYAN}ℹ${NC} $1"; }

echo ""
echo "🎙️  Starting LiveKit Voice Services..."
echo ""

# LiveKit configuration
LIVEKIT_API_KEY="${LIVEKIT_API_KEY:-devkey}"
LIVEKIT_API_SECRET="${LIVEKIT_API_SECRET:-secret}"

# Get project root directory
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Check if native livekit-server is available
USE_NATIVE=false
if command -v livekit-server &> /dev/null; then
    USE_NATIVE=true
    print_info "Found native livekit-server installation"
fi

# Start LiveKit server
if [ "$USE_NATIVE" = true ]; then
    # Native mode (preferred on Mac)
    echo "Starting LiveKit server (native)..."

    # Check if already running
    if lsof -i :7880 > /dev/null 2>&1; then
        print_warning "LiveKit server already running on port 7880"
    else
        # Start in background
        cd "$PROJECT_ROOT"
        nohup livekit-server --dev > /tmp/cia-livekit.log 2>&1 &
        LIVEKIT_PID=$!
        echo $LIVEKIT_PID > /tmp/cia-livekit.pid

        # Wait for it to be ready
        echo -n "Waiting for LiveKit server... "
        MAX_RETRIES=30
        RETRY_COUNT=0
        while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
            if curl -s http://localhost:7880 > /dev/null 2>&1; then
                print_status "Ready (PID: $LIVEKIT_PID)"
                break
            fi
            RETRY_COUNT=$((RETRY_COUNT + 1))
            if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
                print_error "LiveKit failed to start. Check /tmp/cia-livekit.log"
                exit 1
            fi
            sleep 1
        done
    fi
else
    # Docker mode (fallback)
    print_info "Native livekit-server not found, using Docker"
    print_info "For better performance on Mac, install: brew install livekit"
    echo ""

    # Check if Docker is running
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker or install livekit-server natively."
        echo "  Install native: brew install livekit"
        exit 1
    fi

    # Check if LiveKit container already exists
    if docker ps -a --format '{{.Names}}' | grep -q '^cia-livekit$'; then
        if docker ps --format '{{.Names}}' | grep -q '^cia-livekit$'; then
            print_warning "LiveKit container already running"
        else
            echo "Removing old LiveKit container..."
            docker rm cia-livekit
            echo "Creating and starting LiveKit container..."
            docker run -d \
                --name cia-livekit \
                -p 7880:7880 \
                -p 7881:7881 \
                -p 7882:7882/udp \
                -v "${PROJECT_ROOT}/livekit.yaml:/livekit.yaml" \
                livekit/livekit-server:latest \
                --config /livekit.yaml \
                --dev
        fi
    else
        echo "Creating and starting LiveKit container..."
        docker run -d \
            --name cia-livekit \
            -p 7880:7880 \
            -p 7881:7881 \
            -p 7882:7882/udp \
            -v "${PROJECT_ROOT}/livekit.yaml:/livekit.yaml" \
            livekit/livekit-server:latest \
            --config /livekit.yaml \
            --dev
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
fi

# Start token server in background
echo "Starting token server..."

# Check if token server is already running
if lsof -i :3002 > /dev/null 2>&1; then
    print_warning "Token server already running on port 3002"
else
    cd "$PROJECT_ROOT"

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
if [ "$USE_NATIVE" = true ]; then
    echo "  • Mode:            Native (recommended)"
    echo ""
    echo "📝 Logs:"
    echo "  • LiveKit:      tail -f /tmp/cia-livekit.log"
    echo "  • Token server: tail -f /tmp/cia-token-server.log"
else
    echo "  • Mode:            Docker"
    echo ""
    echo "📝 Logs:"
    echo "  • LiveKit:      docker logs -f cia-livekit"
    echo "  • Token server: tail -f /tmp/cia-token-server.log"
fi
echo ""
