#!/bin/bash
# load-demo-files.sh
# Uploads demo VTP files to the API with "Examples" folder organization
#
# Usage:
#   Development mode (no auth required):
#     DEV_BYPASS_AUTH=true ./scripts/start.sh
#     DEV_BYPASS_AUTH=true ./scripts/load-demo-files.sh
#
#   Production mode (with Keycloak token):
#     AUTH_TOKEN="your-jwt-token" ./scripts/load-demo-files.sh
#
#   Custom API URL:
#     API_URL="https://your-server.com" AUTH_TOKEN="token" ./scripts/load-demo-files.sh
#
# Environment variables:
#   API_URL     - Server URL (default: http://localhost:3001)
#   AUTH_TOKEN  - JWT access token for authenticated requests
#   PROJECT_ID  - Target project ID (default: demo project)
#   DEV_BYPASS_AUTH - Set to true in development to bypass Keycloak auth and allow demo uploads without a JWT token

set -e

API_URL="${API_URL:-http://localhost:3001}"
PROJECT_ID="${PROJECT_ID:-00000000-0000-0000-0000-000000000001}"
VTP_DIR="public/vtp_files"
FOLDER_NAME="Examples"
DEV_BYPASS_AUTH="${DEV_BYPASS_AUTH:-false}"

# Build auth headers if token provided or dev bypass is enabled
CURL_HEADERS=()
if [ -n "$AUTH_TOKEN" ]; then
    CURL_HEADERS+=( -H "Authorization: Bearer $AUTH_TOKEN" )
    echo "🔐 Using authenticated mode"
elif [ "$DEV_BYPASS_AUTH" = "true" ]; then
    CURL_HEADERS+=( -H "x-user-id: 00000000-0000-0000-0000-000000000002" )
    CURL_HEADERS+=( -H "x-user-email: admin@cia-web.local" )
    CURL_HEADERS+=( -H "x-user-name: CIA Admin" )
    echo "⚠️  No AUTH_TOKEN set - using dev bypass headers because DEV_BYPASS_AUTH=true"
    echo "   This requires the server to be started with DEV_BYPASS_AUTH=true"
else
    echo "❌ No AUTH_TOKEN provided and DEV_BYPASS_AUTH is not enabled"
    echo "   Run with AUTH_TOKEN=\"<token>\" or DEV_BYPASS_AUTH=true ./scripts/load-demo-files.sh"
    exit 1
fi

echo ""
echo "📦 Loading demo files into CIA Web..."
echo "   API: $API_URL"
echo "   Project: $PROJECT_ID"
echo "   Folder: $FOLDER_NAME"
echo ""

if [ ! -d "$VTP_DIR" ]; then
    echo "❌ Directory $VTP_DIR not found"
    echo "   Run this script from the project root"
    exit 1
fi

# Check if API is running
if ! curl -s "$API_URL/api/health" > /dev/null 2>&1; then
    echo "❌ API server not responding at $API_URL"
    echo "   Run ./scripts/start.sh first"
    exit 1
fi

# Count files
file_count=$(find "$VTP_DIR" -name "*.vtp" 2>/dev/null | wc -l | xargs)
echo "📁 Found $file_count VTP files"
echo ""

if [ "$file_count" -eq 0 ]; then
    echo "⚠️  No VTP files found in $VTP_DIR"
    exit 0
fi

# Upload each file
uploaded=0
skipped=0
failed=0

for file in "$VTP_DIR"/*.vtp; do
    if [ -f "$file" ]; then
        filename=$(basename "$file")
        echo -n "   $filename... "

        # Build curl command with optional auth header
        response=$(curl -s -X POST "$API_URL/api/projects/$PROJECT_ID/files" \
            "${CURL_HEADERS[@]}" \
            -F "file=@$file" \
            -F "folder=$FOLDER_NAME" \
            -F "uploadedBy=demo@cia-web.local" 2>&1)

        if echo "$response" | grep -q '"success":true'; then
            if echo "$response" | grep -q '"deduplicated":true'; then
                echo "⏭️  exists"
                skipped=$((skipped + 1))
            else
                echo "✅ uploaded"
                uploaded=$((uploaded + 1))
            fi
        elif echo "$response" | grep -q '"error":"Unauthorized"'; then
            echo "❌ unauthorized (need valid AUTH_TOKEN)"
            failed=$((failed + 1))
        elif echo "$response" | grep -q '"error":"Forbidden"'; then
            echo "❌ forbidden (token lacks permission)"
            failed=$((failed + 1))
        else
            echo "❌ failed"
            # Show error details for debugging
            error_msg=$(echo "$response" | grep -o '"error":"[^"]*"' | head -1 || echo "")
            if [ -n "$error_msg" ]; then
                echo "      $error_msg"
            fi
            failed=$((failed + 1))
        fi
    fi
done

echo ""
echo "════════════════════════════════"
echo "  Uploaded: $uploaded"
echo "  Skipped:  $skipped (already exist)"
echo "  Failed:   $failed"
echo "════════════════════════════════"
echo ""

if [ $uploaded -gt 0 ] || [ $skipped -gt 0 ]; then
    echo "✅ Demo files ready!"
    echo "   View at: $API_URL/api/projects/$PROJECT_ID/files"
fi