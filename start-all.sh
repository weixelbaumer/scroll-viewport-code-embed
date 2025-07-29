#!/bin/bash

# GitHub Code Block - Complete Startup Script
# Handles npm installation, server startup, and tunnel management

set -e # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$PROJECT_DIR/startup.log"
PACKAGE_LOCK="$PROJECT_DIR/package-lock.json"
NODE_MODULES="$PROJECT_DIR/node_modules"

# Logging function
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

log_warn() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a "$LOG_FILE"
}

log_info() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] INFO:${NC} $1" | tee -a "$LOG_FILE"
}

# Cleanup function for graceful shutdown
cleanup() {
    log_warn "Shutting down services..."
    
    # Kill server processes
    if [[ -n "$SERVER_PID" ]] && kill -0 "$SERVER_PID" 2>/dev/null; then
        log "Stopping server (PID: $SERVER_PID)..."
        kill -TERM "$SERVER_PID" 2>/dev/null || true
        sleep 2
        kill -KILL "$SERVER_PID" 2>/dev/null || true
    fi
    
    # Kill tunnel processes
    if [[ -n "$TUNNEL_PID" ]] && kill -0 "$TUNNEL_PID" 2>/dev/null; then
        log "Stopping tunnel (PID: $TUNNEL_PID)..."
        kill -TERM "$TUNNEL_PID" 2>/dev/null || true
        sleep 2
        kill -KILL "$TUNNEL_PID" 2>/dev/null || true
    fi
    
    # Fallback: kill all node processes and cloudflared
    log_warn "Performing cleanup of any remaining processes..."
    killall node 2>/dev/null || true
    pkill -f "cloudflared tunnel.*github-fetcher-dev" 2>/dev/null || true
    
    log "✅ Cleanup completed"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM EXIT

# Start of script
log "🚀 GitHub Code Block - Complete Startup Script"
log "Project directory: $PROJECT_DIR"

# Change to project directory
cd "$PROJECT_DIR"

# Check Node.js version
if ! command -v node &> /dev/null; then
    log_error "Node.js is not installed. Please install Node.js >= 14.0.0"
    exit 1
fi

NODE_VERSION=$(node --version | sed 's/v//')
log_info "Node.js version: $NODE_VERSION"

# Check if we need to install/update dependencies
NEED_INSTALL=false

if [[ ! -d "$NODE_MODULES" ]]; then
    log_warn "node_modules directory not found"
    NEED_INSTALL=true
elif [[ ! -f "$PACKAGE_LOCK" ]]; then
    log_warn "package-lock.json not found"
    NEED_INSTALL=true
elif [[ package.json -nt "$PACKAGE_LOCK" ]]; then
    log_warn "package.json is newer than package-lock.json"
    NEED_INSTALL=true
elif [[ ! -x "$NODE_MODULES/.bin/nodemon" ]]; then
    log_warn "nodemon not found in node_modules"
    NEED_INSTALL=true
fi

# Install/update dependencies if needed
if [[ "$NEED_INSTALL" == true ]] || [[ "$1" == "--force-install" ]]; then
    log "📦 Installing/updating npm dependencies..."
    
    # Clean install if forced or major issues
    if [[ "$1" == "--force-install" ]] || [[ ! -d "$NODE_MODULES" ]]; then
        log "Performing clean installation..."
        rm -rf "$NODE_MODULES" "$PACKAGE_LOCK" 2>/dev/null || true
    fi
    
    # Install dependencies
    if ! npm install; then
        log_error "npm install failed"
        exit 1
    fi
    
    log "✅ Dependencies installed successfully"
else
    log "✅ Dependencies are up to date"
fi

# Verify critical dependencies
log "🔍 Verifying critical dependencies..."

if [[ ! -x "$NODE_MODULES/.bin/nodemon" ]]; then
    log_error "nodemon not found. Try running with --force-install"
    exit 1
fi

if ! node -e "require('express')" 2>/dev/null; then
    log_error "Express not properly installed"
    exit 1
fi

log "✅ All dependencies verified"

# Clean up any existing processes
log "🧹 Cleaning up existing processes..."
killall node 2>/dev/null || log_warn "No existing node processes found"
pkill -f "cloudflared tunnel.*github-fetcher-dev" 2>/dev/null || log_warn "No existing tunnel processes found"
sleep 2

# Verify tunnel script exists
if [[ ! -f "./start-dev-tunnel.sh" ]]; then
    log_error "start-dev-tunnel.sh not found"
    exit 1
fi

# Make tunnel script executable
chmod +x ./start-dev-tunnel.sh

# Create database directory if it doesn't exist
mkdir -p db

# Set environment variables
export NODE_ENV=development
export AC_LOCAL_BASE_URL=https://dev.tandav.com
export FORCE_DB_SYNC=true
export FORCE_DB_FILE=true

log "🌍 Environment configured:"
log "  NODE_ENV: $NODE_ENV"
log "  AC_LOCAL_BASE_URL: $AC_LOCAL_BASE_URL"
log "  FORCE_DB_SYNC: $FORCE_DB_SYNC"

# Start the server
log "🚀 Starting GitHub Code Block server..."
"$NODE_MODULES/.bin/nodemon" server.js > "$LOG_FILE.server" 2>&1 &
SERVER_PID=$!

# Wait for server to start and verify
log "⏳ Waiting for server to initialize..."
sleep 3

if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    log_error "Server failed to start. Check log: $LOG_FILE.server"
    cat "$LOG_FILE.server" 2>/dev/null || true
    exit 1
fi

# Test server is responding
log "🔍 Testing server connectivity..."
if curl -sf "http://localhost:3000" > /dev/null 2>&1; then
    log "✅ Server is responding on port 3000"
else
    log_warn "Server may still be starting up..."
fi

# Check if tunnel is already running
if pgrep -f "cloudflared tunnel.*github-fetcher-dev" > /dev/null; then
    log "✅ Cloudflare tunnel is already running"
    TUNNEL_PID=$(pgrep -f "cloudflared tunnel.*github-fetcher-dev")
else
    log "🌐 Starting Cloudflare tunnel..."
    ./start-dev-tunnel.sh > "$LOG_FILE.tunnel" 2>&1 &
    TUNNEL_PID=$!
    
    # Wait for tunnel to establish
    log "⏳ Waiting for tunnel to establish connections..."
    sleep 5
    
    if ! kill -0 "$TUNNEL_PID" 2>/dev/null; then
        log_error "Tunnel failed to start. Check log: $LOG_FILE.tunnel"
        cat "$LOG_FILE.tunnel" 2>/dev/null || true
        exit 1
    fi
    
    log "✅ Cloudflare tunnel started successfully"
fi

# Test public URL accessibility
log "🔍 Testing public URL accessibility..."
if curl -sf "https://dev.tandav.com/atlassian-connect.json" > /dev/null 2>&1; then
    log "✅ Public URL is accessible"
else
    log_warn "Public URL may not be ready yet (this is normal during startup)"
fi

# Display status
log ""
log "🎉 GitHub Code Block App is now running!"
log ""
log "📊 Status Summary:"
log "  • Server PID: $SERVER_PID"
log "  • Tunnel PID: $TUNNEL_PID"
log "  • Local URL: http://localhost:3000"
log "  • Public URL: https://dev.tandav.com"
log "  • App Descriptor: https://dev.tandav.com/atlassian-connect.json"
log "  • Server Log: $LOG_FILE.server"
log "  • Tunnel Log: $LOG_FILE.tunnel"
log ""
log "📋 Next Steps:"
log "  1. Install in Confluence: https://dev.tandav.com/atlassian-connect.json"
log "  2. Use 'GitHub Code Block' macro in Confluence editor"
log "  3. Monitor logs in separate terminal: tail -f $LOG_FILE.server"
log ""
log "⚠️  Press Ctrl+C to shutdown all services"
log ""

# Keep the script running and monitor processes
while true; do
    # Check if server is still running
    if ! kill -0 "$SERVER_PID" 2>/dev/null; then
        log_error "Server process died unexpectedly!"
        break
    fi
    
    # Check if tunnel is still running
    if ! kill -0 "$TUNNEL_PID" 2>/dev/null; then
        log_error "Tunnel process died unexpectedly!"
        break
    fi
    
    sleep 10
done

# If we get here, something went wrong
log_error "Service monitoring detected a failure"
exit 1