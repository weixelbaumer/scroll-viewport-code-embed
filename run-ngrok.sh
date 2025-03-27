#!/bin/bash

# Colors for terminal output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color
BOLD='\033[1m'

echo -e "${YELLOW}${BOLD}Starting ngrok with proper headers for GitHub Code Renderer...${NC}"

# Kill any existing ngrok processes
echo -e "${BLUE}Checking for existing ngrok processes...${NC}"
NGROK_PIDS=$(ps aux | grep ngrok | grep -v grep | awk '{print $2}')
if [ ! -z "$NGROK_PIDS" ]; then
    echo -e "${YELLOW}Killing existing ngrok processes: $NGROK_PIDS${NC}"
    for PID in $NGROK_PIDS; do
        kill -9 $PID 2>/dev/null
    done
    sleep 1
fi

# Start ngrok with correct header format
echo -e "${GREEN}Starting ngrok with proper headers...${NC}"
echo -e "${YELLOW}Command: ${BOLD}ngrok http --request-header-add 'ngrok-skip-browser-warning: true' 3000${NC}"
echo ""

# Run ngrok with the proper headers
# IMPORTANT: Note the correct format - the option comes BEFORE the port number
# and the header value has a space after the colon
ngrok http --request-header-add 'ngrok-skip-browser-warning: true' 3000 