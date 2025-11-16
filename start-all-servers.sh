#!/bin/bash
# ==============================================================================
# CIA Web - Complete Development Environment Startup (tmux)
# ==============================================================================
# Starts all servers in one tmux window with split panes:
# 1. Docker (PostgreSQL + API Server)
# 2. Y.js WebSocket Server
# 3. LiveKit Token Server
# 4. LiveKit Server
# 5. Webpack Dev Server (Main App)
#
# Usage: chmod +x start-all-servers.sh && ./start-all-servers.sh
# ==============================================================================

echo "🚀 Starting CIA Web Complete Development Environment..."
echo ""

# Check if tmux is installed
if ! command -v tmux &> /dev/null; then
    echo "❌ tmux is not installed!"
    echo ""
    echo "Install tmux:"
    echo "  macOS:  brew install tmux"
    echo "  Linux:  sudo apt install tmux"
    exit 1
fi

# Check if docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed!"
    echo ""
    echo "Install Docker:"
    echo "  macOS:  https://docs.docker.com/desktop/install/mac-install/"
    echo "  Linux:  https://docs.docker.com/engine/install/"
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  Warning: .env file not found!"
    echo "   Creating from .env.example..."
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "   ✅ Created .env - please configure it before production use"
    else
        echo "   ❌ .env.example not found either!"
        echo "   You'll need to create a .env file manually"
    fi
    echo ""
fi

# Kill existing session if it exists
tmux kill-session -t cia-web 2>/dev/null

echo "📦 Starting Docker containers first..."
docker-compose up -d

# Wait for Docker containers to be healthy
echo "⏳ Waiting for database to be ready..."
sleep 3

# Check if postgres is ready
until docker exec cia-postgres pg_isready -U ${POSTGRES_USER:-postgres} 2>/dev/null; do
    echo "   Still waiting for PostgreSQL..."
    sleep 2
done

echo "✅ Docker containers ready!"
echo ""
echo "🎨 Creating tmux session with split panes..."
echo ""

# ==============================================================================
# Create tmux session with perfect layout
# ==============================================================================

# Start new session detached with Docker logs
tmux new-session -d -s cia-web -n "Servers" "echo '📦 Docker Containers (Postgres + API)'; echo ''; docker-compose logs -f"

# Split horizontally (top/bottom) - creates pane 1
tmux split-window -v -t cia-web:0

# Split the bottom pane vertically (left/right) - creates pane 2
tmux split-window -h -t cia-web:0.1

# Split the top-right pane horizontally - creates pane 3
tmux split-window -v -t cia-web:0.2

# Split the bottom-right pane horizontally - creates pane 4
tmux split-window -v -t cia-web:0.3

# Now we have 5 panes:
# ┌─────────────┬─────────────┐
# │             │   Pane 2    │
# │   Pane 0    │  (Token)    │
# │  (Docker)   ├─────────────┤
# │             │   Pane 3    │
# │             │ (LiveKit)   │
# ├─────────────┼─────────────┤
# │   Pane 1    │   Pane 4    │
# │   (Y.js)    │   (App)     │
# └─────────────┴─────────────┘

# Send commands to each pane
# Pane 0: Docker logs (already running)

# Pane 1: Y.js Server
tmux send-keys -t cia-web:0.1 "echo '🔄 Y.js WebSocket Server' && echo '' && node server.js" C-m

# Pane 2: Token Server
tmux send-keys -t cia-web:0.2 "echo '🎫 LiveKit Token Server' && echo '' && node token-server.js" C-m

# Pane 3: LiveKit Server
tmux send-keys -t cia-web:0.3 "echo '🎤 LiveKit Server' && echo '' && livekit-server --dev" C-m

# Pane 4: Main App (with slight delay)
tmux send-keys -t cia-web:0.4 "sleep 3 && echo '🌐 Main Application' && echo '' && npm start" C-m

# Set pane titles (if your tmux supports it)
tmux select-pane -t cia-web:0.0 -T "Docker"
tmux select-pane -t cia-web:0.1 -T "Y.js"
tmux select-pane -t cia-web:0.2 -T "Token"
tmux select-pane -t cia-web:0.3 -T "LiveKit"
tmux select-pane -t cia-web:0.4 -T "App"

# Focus on the main app pane
tmux select-pane -t cia-web:0.4

# ==============================================================================
# Display info and attach
# ==============================================================================

echo ""
echo "✅ All servers started in tmux session: cia-web"
echo ""
echo "📋 Server Status:"
echo "   • PostgreSQL:      localhost:5432"
echo "   • API Server:      http://localhost:3001"
echo "   • Y.js Server:     ws://localhost:8080"
echo "   • Token Server:    http://localhost:3002"
echo "   • LiveKit Server:  http://localhost:7880"
echo "   • Web App:         https://localhost:8081"
echo ""
echo "🎮 Tmux Controls:"
echo "   • Switch panes:    Ctrl+b then arrow keys"
echo "   • Zoom pane:       Ctrl+b then z (toggle)"
echo "   • Scroll mode:     Ctrl+b then [ (q to exit)"
echo "   • Detach:          Ctrl+b then d"
echo "   • Kill session:    Ctrl+b then : then 'kill-session'"
echo ""
echo "📝 Useful commands:"
echo "   • Reattach:        tmux attach -t cia-web"
echo "   • Stop all:        ./stop-all-servers.sh"
echo ""
echo "⏳ Wait ~10 seconds for all servers to initialize..."
echo "🌐 Then open: https://localhost:8081"
echo ""
echo "Attaching to tmux session in 3 seconds..."
sleep 3

# Attach to the session
tmux attach -t cia-web