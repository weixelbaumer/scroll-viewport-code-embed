#!/bin/bash

# Kill any existing simple server process
pkill -f "node simple-server.js" || echo "No existing simple server to kill"

# Start our simplified server
echo "Starting simplified GitHub Code Block server..."
node simple-server.js &

# Let the server initialize
sleep 2

# Check if server is running
if curl -s http://localhost:3000/atlassian-connect.json | grep -q "version"; then
    echo "✅ Server is running successfully!"
    echo "✅ Access the GitHub Code Block app at: https://dev.tandav.com"
    echo "✅ Atlassian Connect Base URL: https://dev.tandav.com"
else
    echo "❌ Server failed to start properly"
    exit 1
fi

# Make sure tunnel is running in the background
if ps aux | grep -v grep | grep -q "cloudflared tunnel"; then
    echo "✅ Cloudflare tunnel is already running"
else
    echo "❌ Cloudflare tunnel is not running. Starting it now..."
    ./start-dev-tunnel.sh &
    echo "✅ Cloudflare tunnel started"
fi

echo ""
echo "Your GitHub Code Block app is now running!"
echo "To check logs, use: tail -f simple-server.log"

# Keep this script running so user can easily kill everything with Ctrl+C
echo "Press Ctrl+C to shutdown server and tunnel"
wait 