#!/usr/bin/env bash
# wait-for-synapse.sh
# Waits until Synapse responds to its health endpoint before allowing dependent services to start.

set -euo pipefail

SYNAPSE_HOST=${SYNAPSE_HOST:-localhost}
SYNAPSE_PORT=${SYNAPSE_PORT:-8008}
SYNAPSE_URL=${SYNAPSE_URL:-http://${SYNAPSE_HOST}:${SYNAPSE_PORT}/_matrix/client/versions}
MAX_ATTEMPTS=${MAX_SYNAPSE_ATTEMPTS:-30}
DELAY_SECONDS=${SYNAPSE_POLL_DELAY:-2}

attempt=0
echo "⏳ Waiting for Synapse at ${SYNAPSE_URL}..."
while [ $attempt -lt $MAX_ATTEMPTS ]; do
  if curl -fsS "$SYNAPSE_URL" > /dev/null 2>&1; then
    echo "   Synapse is healthy"
    exit 0
  fi
  attempt=$((attempt + 1))
  echo "   Synapse not ready yet (${attempt}/${MAX_ATTEMPTS}), retrying in ${DELAY_SECONDS}s..."
  sleep "$DELAY_SECONDS"
done

echo "❌ Synapse did not become healthy after ${MAX_ATTEMPTS} attempts"
exit 1
