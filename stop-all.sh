#!/bin/bash

# GitHub Code Block - Stop All Services Script

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🛑 Stopping GitHub Code Block services...${NC}"

# Kill all node processes
echo -e "${YELLOW}Stopping Node.js processes...${NC}"
if killall node 2>/dev/null; then
    echo -e "${GREEN}✅ Node.js processes stopped${NC}"
else
    echo -e "${YELLOW}⚠️  No Node.js processes were running${NC}"
fi

# Kill Cloudflare tunnel processes
echo -e "${YELLOW}Stopping Cloudflare tunnel...${NC}"
if pkill -f "cloudflared tunnel.*github-fetcher-dev" 2>/dev/null; then
    echo -e "${GREEN}✅ Cloudflare tunnel stopped${NC}"
else
    echo -e "${YELLOW}⚠️  No Cloudflare tunnel processes were running${NC}"
fi

# Wait a moment for processes to clean up
sleep 2

# Verify all processes are stopped
NODE_PROCS=$(pgrep node 2>/dev/null | wc -l)
TUNNEL_PROCS=$(pgrep -f "cloudflared tunnel.*github-fetcher-dev" 2>/dev/null | wc -l)

if [[ $NODE_PROCS -eq 0 ]] && [[ $TUNNEL_PROCS -eq 0 ]]; then
    echo -e "${GREEN}✅ All GitHub Code Block services stopped successfully${NC}"
else
    echo -e "${YELLOW}⚠️  Some processes may still be running:${NC}"
    [[ $NODE_PROCS -gt 0 ]] && echo -e "  • Node.js processes: $NODE_PROCS"
    [[ $TUNNEL_PROCS -gt 0 ]] && echo -e "  • Tunnel processes: $TUNNEL_PROCS"
fi

echo -e "${BLUE}🏁 Stop script completed${NC}"