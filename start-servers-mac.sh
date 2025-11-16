#!/bin/bash
# CIA Web Development Server Startup Script (macOS)
# Usage: chmod +x start-servers-mac.sh && ./start-servers-mac.sh

echo "🚀 Starting CIA Web Development Servers..."
echo ""

# Get the current directory
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Terminal 1 - Y.js WebSocket Server
osascript <<END
tell application "Terminal"
    do script "cd '$DIR' && echo '🔄 Starting Y.js WebSocket Server...' && node server.js"
end tell
END

sleep 1

# Terminal 2 - LiveKit Token Server  
osascript <<END
tell application "Terminal"
    do script "cd '$DIR' && echo '🎫 Starting LiveKit Token Server...' && node token-server.js"
end tell
END

sleep 1

# Terminal 3 - LiveKit Server
osascript <<END
tell application "Terminal"
    do script "cd '$DIR' && echo '🎤 Starting LiveKit Server...' && livekit-server --dev"
end tell
END

sleep 2

# Terminal 4 - Webpack Dev Server (Main App)
osascript <<END
tell application "Terminal"
    do script "cd '$DIR' && echo '🌐 Starting Main Application...' && npm start"
end tell
END

echo "✅ All servers started in separate terminal windows!"
echo ""
echo "📋 Server Status:"
echo "   • Y.js Server:     ws://localhost:8080"
echo "   • Token Server:    http://localhost:3002"  
echo "   • LiveKit Server:  http://localhost:7880"
echo "   • Web App:         https://localhost:8081"
echo ""
echo "⏳ Wait ~10 seconds for all servers to initialize..."
echo "🌐 Then open: https://localhost:8081"