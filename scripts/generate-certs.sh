#!/usr/bin/env bash
# Generate local dev TLS certificates for the HTTPS dev server (required for WebXR).
#
# Usage:
#   ./scripts/generate-certs.sh            # localhost only
#   ./scripts/generate-certs.sh 192.168.1.50  # also valid for a LAN IP (Vision Pro testing)
#
# Prefers mkcert (trusted by browsers after `mkcert -install`); falls back to a
# plain openssl self-signed cert that browsers will warn about.

set -euo pipefail

CERT_DIR="$(cd "$(dirname "$0")/.." && pwd)/certs"
mkdir -p "$CERT_DIR"

HOSTS=(localhost 127.0.0.1 ::1 "$@")

if command -v mkcert >/dev/null 2>&1; then
  echo "Using mkcert for: ${HOSTS[*]}"
  mkcert -install
  mkcert -key-file "$CERT_DIR/key.pem" -cert-file "$CERT_DIR/cert.pem" "${HOSTS[@]}"
else
  echo "mkcert not found — generating a self-signed cert with openssl."
  echo "Install mkcert (https://mkcert.dev) for a browser-trusted cert, especially for Vision Pro."
  SAN="DNS:localhost,IP:127.0.0.1"
  for h in "$@"; do
    if [[ "$h" =~ ^[0-9.]+$ ]]; then SAN="$SAN,IP:$h"; else SAN="$SAN,DNS:$h"; fi
  done
  openssl req -x509 -newkey rsa:2048 -sha256 -days 365 -nodes \
    -keyout "$CERT_DIR/key.pem" -out "$CERT_DIR/cert.pem" \
    -subj "/CN=localhost" -addext "subjectAltName=$SAN"
fi

echo "Certificates written to $CERT_DIR (key.pem, cert.pem)."
echo "Run 'npm start' to launch the HTTPS dev server."
