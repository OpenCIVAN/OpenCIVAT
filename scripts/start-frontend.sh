#!/bin/bash
# start-frontend.sh - Start WebSocket server and frontend dev server

set -e

echo "🚀 Starting CIA Web Frontend..."
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

# Load environment variables (if present)
if [ -f ".env" ]; then
    set -a
    # shellcheck disable=SC1091
    source .env
    set +a
fi

# Check if backend services are running
if ! curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠${NC} Backend services not detected. Run ./start.sh first!"
    echo ""
    read -p "Start backend services now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        ./start.sh
    else
        exit 1
    fi
fi

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down frontend services..."
    kill $WEBSOCKET_PID 2>/dev/null || true
    kill $WEBPACK_PID 2>/dev/null || true
    exit 0
}

trap cleanup SIGINT SIGTERM

echo ""
echo "Starting Webpack dev server..."
npm start &
WEBPACK_PID=$!

echo ""
print_status "Frontend services started!"
echo ""
echo "  • Frontend:         http://localhost:8080"
echo ""
echo "Press Ctrl+C to stop services"
echo ""

# Wait for processes
wait
