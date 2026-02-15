#!/usr/bin/env bash
# ensure-matrix-network.sh
# Ensures the external cia_matrix_network exists before running Docker compose.

set -euo pipefail

NETWORK_NAME=${CIA_MATRIX_NETWORK_NAME:-cia_matrix_network}

ensure_matrix_network() {
  if ! docker network inspect "$NETWORK_NAME" > /dev/null 2>&1; then
    echo "   Creating $NETWORK_NAME..."
    docker network create "$NETWORK_NAME" > /dev/null 2>&1 || true
  fi
}
