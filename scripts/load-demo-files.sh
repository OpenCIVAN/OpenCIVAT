#!/bin/bash
# load-demo-files.sh
# Uploads demo VTP files to MinIO via the API for testing/demos

set -e

API_URL="${API_URL:-http://localhost:3001}"
PROJECT_ID="00000000-0000-0000-0000-000000000001"
VTP_DIR="public/vtp_files"

echo "📦 Loading demo files into CIA Web..."
echo "   API: $API_URL"
echo "   Project: $PROJECT_ID"
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

        response=$(curl -s -X POST "$API_URL/api/projects/$PROJECT_ID/files" \
            -F "file=@$file" \
            -F "uploadedBy=demo@cia-web.local" 2>&1)

        if echo "$response" | grep -q '"success":true'; then
            if echo "$response" | grep -q '"deduplicated":true'; then
                echo "⏭️  exists"
                skipped=$((skipped + 1))
            else
                echo "✅ uploaded"
                uploaded=$((uploaded + 1))
            fi
        else
            echo "❌ failed"
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