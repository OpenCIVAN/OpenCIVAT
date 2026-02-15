#!/bin/bash
# Rebuild the API container without cache
# Usage: ./scripts/rebuild-api.sh

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
source "$SCRIPT_DIR/ensure-matrix-network.sh"

ensure_before_compose() {
  ensure_matrix_network
}

ensure_before_compose
echo "Stopping api container..."
docker compose stop api

echo "Removing api container..."
docker compose rm -f api

echo "Rebuilding api with --no-cache..."
ensure_before_compose
docker compose build --no-cache api

echo "Starting api container..."
ensure_before_compose
./scripts/wait-for-synapse.sh
docker compose up -d api

echo "Done! Tailing logs (Ctrl+C to exit)..."
docker compose logs -f api
