#!/bin/bash

# Kill any existing server processes
pkill -f "node server.js" || true

# Set environment variables
export NODE_ENV=development
export AC_LOCAL_BASE_URL=https://dev.tandav.com
export FORCE_DB_FILE=true

# Start the server
echo "Starting GitHub Code Block server..."
node server.js &
SERVER_PID=$!

# Wait for server to start
sleep 2

# Check if server is running
if ! kill -0 $SERVER_PID 2>/dev/null; then
    echo "❌ Server failed to start!"
    exit 1
fi

echo "✅ Server is running successfully!"
echo "✅ Access the GitHub Code Block app at: https://dev.tandav.com"
echo "✅ Atlassian Connect Base URL: https://dev.tandav.com"

# Check if tunnel is already running
if pgrep -f "cloudflared tunnel.*github-fetcher-dev" > /dev/null; then
    echo "✅ Cloudflare tunnel is already running"
else
    echo "Starting Cloudflare tunnel..."
    ./start-dev-tunnel.sh &
    TUNNEL_PID=$!
    sleep 2
    
    if ! kill -0 $TUNNEL_PID 2>/dev/null; then
        echo "❌ Tunnel failed to start!"
        exit 1
    fi
    echo "✅ Cloudflare tunnel started successfully"
fi

echo "Your GitHub Code Block app is now running!"
echo "Press Ctrl+C to shutdown server and tunnel"

# Wait for Ctrl+C
wait $SERVER_PID 