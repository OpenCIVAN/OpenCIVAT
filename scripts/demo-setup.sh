#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
cd "$SCRIPT_DIR/.."

export DEV_BYPASS_AUTH=true

echo "🚀 Running demo setup in DEV_BYPASS_AUTH=true mode"

echo "1/3: Resetting database and services"
./scripts/reset-database.sh --quick

echo "2/3: Starting backend services with dev auth bypass"
DEV_BYPASS_AUTH=true ./scripts/start.sh

echo "3/3: Uploading demo VTP files"
DEV_BYPASS_AUTH=true ./scripts/load-demo-files.sh

echo ""
echo "✅ Demo setup complete. Open the app in your browser once services are ready."
echo "If you need the frontend only, run: npm start"
