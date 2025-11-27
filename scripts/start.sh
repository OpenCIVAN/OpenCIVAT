#!/bin/bash
# start.sh - Start all CIA Web services

set -e  # Exit on error

echo "🚀 Starting CIA Web..."
echo ""

# Colors for output
GREEN="$(echo -e '\033[0;32m')"
YELLOW="$(echo -e '\033[1;33m')"
RED="$(echo -e '\033[0;31m')"
NC="$(echo -e '\033[0m')" # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if Docker is running
echo "📦 Checking Docker..."
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker Desktop and try again."
    exit 1
fi
print_status "Docker is running"
echo ""

# Start Docker services
echo "🐳 Starting Docker services (PostgreSQL, MinIO, API, Y.js)..."
docker-compose up -d

# Wait for services to be healthy
echo ""
echo "⏳ Waiting for services to be healthy..."
sleep 5

# Check PostgreSQL
echo -n "  PostgreSQL: "
if docker exec cia-postgres pg_isready -U ciauser -d cia_analytics > /dev/null 2>&1; then
    print_status "Ready"
else
    print_warning "Not ready yet, waiting..."
    sleep 5
fi

# Check MinIO
echo -n "  MinIO: "
if curl -s http://localhost:9000/minio/health/live > /dev/null 2>&1; then
    print_status "Ready"
else
    print_warning "Not ready yet, waiting..."
    sleep 3
fi

# Check API
echo -n "  API: "
MAX_RETRIES=10
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
        print_status "Ready"
        break
    else
        RETRY_COUNT=$((RETRY_COUNT + 1))
        if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
            print_error "API failed to start. Check logs with: docker-compose logs api"
            exit 1
        fi
        sleep 2
    fi
done

# Check Y.js WebSocket
echo -n "  Y.js WebSocket: "
if nc -z localhost 9001 2>/dev/null; then
    print_status "Ready"
else
    print_warning "Not ready yet, waiting..."
    sleep 3
fi


echo ""
print_status "All Docker services are running!"
echo ""

# Check if npm dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing npm dependencies..."
    npm install
    echo ""
fi

echo "🌐 Services running:"
echo "  • PostgreSQL:     localhost:5432"
echo "  • MinIO:          localhost:9000 (Console: localhost:9002)"
echo "  • API:            http://localhost:3001"
echo "  • Y.js WebSocket: ws://localhost:9001"
echo ""

echo "📝 Next steps:"
echo ""
echo "  Start the frontend:"
echo "     ${YELLOW}npm start${NC}"
echo ""
echo "  Or use the convenience script:"
echo "     ${YELLOW}./scripts/start-frontend.sh${NC}"
echo ""

print_status "Backend services ready!"
