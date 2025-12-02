#!/bin/bash
# reset-database.sh
# Wipes the database and restarts with fresh schema
# Usage: 
#   ./scripts/reset-database.sh           # Interactive reset
#   ./scripts/reset-database.sh --quick   # Fast reset, no prompts
#   ./scripts/reset-database.sh --rebuild # Reset + rebuild Docker images

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

QUICK_MODE=false
REBUILD_MODE=false

for arg in "$@"; do
    case $arg in
        --quick|-q) QUICK_MODE=true ;;
        --rebuild|-r) REBUILD_MODE=true ;;
    esac
done

if [ "$QUICK_MODE" = false ]; then
    echo "============================================"
    echo "  Database Reset Script"
    echo "============================================"
    echo ""
    [ "$REBUILD_MODE" = true ] && echo -e "${YELLOW}Mode: Full rebuild (will rebuild Docker images)${NC}"
    echo -e "${YELLOW}⚠️  WARNING: This will DELETE ALL DATA!${NC}"
    echo ""
    read -p "Are you sure? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        echo "Cancelled."
        exit 0
    fi
    echo ""
fi

echo "🔄 Resetting database and Y.js state..."

# Stop and remove volumes (this clears postgres AND restarts y-websocket fresh)
echo "🛑 Stopping containers and removing volumes..."
docker compose down -v > /dev/null 2>&1

# The Y.js server is in-memory, so restarting clears it.
# But the BROWSER has Y.js data in IndexedDB that will re-sync!

# Clean up dangling images if rebuilding
if [ "$REBUILD_MODE" = true ]; then
    echo "🗑️  Cleaning up Docker system..."
    docker system prune -f > /dev/null 2>&1
    echo "🔨 Rebuilding containers..."
    docker compose up --build -d > /dev/null 2>&1
else
    echo "🚀 Starting with fresh database..."
    docker compose up -d > /dev/null 2>&1
fi

# Wait for postgres
echo "⏳ Waiting for PostgreSQL..."
max_attempts=30
attempt=0
while [ $attempt -lt $max_attempts ]; do
    if docker compose exec -T postgres pg_isready -U ciauser -d cia_analytics > /dev/null 2>&1; then
        break
    fi
    attempt=$((attempt + 1))
    [ "$QUICK_MODE" = false ] && echo "   Waiting... ($attempt/$max_attempts)"
    sleep 2
done

if [ $attempt -eq $max_attempts ]; then
    echo -e "${RED}❌ PostgreSQL failed to start${NC}"
    exit 1
fi

# Verify
sample_count=$(docker compose exec -T postgres psql -U ciauser -d cia_analytics -t -c "SELECT COUNT(*) FROM datasets WHERE uploaded_by = 'system';" 2>/dev/null | xargs || echo "0")

echo ""
echo -e "${GREEN}✅ Database reset complete!${NC}"
echo "📊 $sample_count sample files loaded"

if [ "$QUICK_MODE" = false ]; then
    echo ""
    echo "🌐 Services running:"
    echo "   • API:      http://localhost:3001"
    echo "   • MinIO:    http://localhost:9000 (Console: localhost:9002)"
    echo "   • Redis:    localhost:6379"
    echo "   • Y.js:     ws://localhost:9001"
    echo ""
    echo -e "${YELLOW}⚠️  IMPORTANT: Clear browser IndexedDB to remove stale Y.js data!${NC}"
    echo "   The browser caches Y.js state locally. After a database reset,"
    echo "   old datasets will re-appear unless you clear the browser storage."
    echo ""
    echo "   Run this in browser DevTools console (F12 → Console):"
    echo -e "   ${GREEN}indexedDB.deleteDatabase('cia-datasets'); location.reload();${NC}"
fi