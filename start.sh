#!/bin/bash

# Colors for better output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Setting up GitHub Code Renderer for Confluence...${NC}"

# Kill existing ngrok processes
echo -e "${YELLOW}Checking for existing ngrok processes...${NC}"
NGROK_PIDS=$(ps aux | grep ngrok | grep -v grep | awk '{print $2}')
if [ ! -z "$NGROK_PIDS" ]; then
    echo -e "${YELLOW}Killing existing ngrok processes: $NGROK_PIDS${NC}"
    for PID in $NGROK_PIDS; do
        kill -9 $PID 2>/dev/null
    done
    sleep 1
else
    echo -e "${GREEN}No existing ngrok processes found.${NC}"
fi

# Kill existing node server processes
echo -e "${YELLOW}Checking for existing node server processes...${NC}"
NODE_PIDS=$(ps aux | grep "node server.js" | grep -v grep | awk '{print $2}')
if [ ! -z "$NODE_PIDS" ]; then
    echo -e "${YELLOW}Killing existing node server processes: $NODE_PIDS${NC}"
    for PID in $NODE_PIDS; do
        kill -9 $PID 2>/dev/null
    done
    sleep 1
else
    echo -e "${GREEN}No existing node server processes found.${NC}"
fi

# Start the server
echo -e "${YELLOW}Starting the server...${NC}"
node server.js &
NODE_PID=$!
echo -e "${GREEN}Server started with PID: $NODE_PID${NC}"

# Wait for server to initialize
echo -e "${YELLOW}Waiting for server to initialize...${NC}"
sleep 2

# Start ngrok with proper headers - CORRECT SYNTAX
echo -e "${YELLOW}Starting ngrok with proper headers...${NC}"
ngrok http --request-header-add 'ngrok-skip-browser-warning: true' 3000 &
NGROK_PID=$!
echo -e "${GREEN}Ngrok started with PID: $NGROK_PID${NC}"

# Wait for ngrok to initialize
echo -e "${YELLOW}Waiting for ngrok to initialize...${NC}"
sleep 5

# Get the ngrok URL
echo -e "${YELLOW}Getting ngrok URL...${NC}"
MAX_RETRIES=10
RETRY=0

while [ $RETRY -lt $MAX_RETRIES ]; do
    NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o "https://[a-zA-Z0-9\.\-]*\.ngrok-free.app" | head -1)
    
    if [ ! -z "$NGROK_URL" ]; then
        echo -e "${GREEN}Ngrok URL: $NGROK_URL${NC}"
        
        # Update the atlassian-connect.json with the new ngrok URL
        echo -e "${YELLOW}Updating atlassian-connect.json with new ngrok URL...${NC}"
        sed -i.bak "s|\"baseUrl\": \"https://[a-zA-Z0-9\.\-]*\.ngrok-free.app\"|\"baseUrl\": \"$NGROK_URL\"|g" atlassian-connect/atlassian-connect.json
        echo -e "${GREEN}Updated atlassian-connect.json${NC}"
        
        # Wait a moment for changes to take effect
        sleep 1
        
        # Test the connection with PROPER HEADERS
        echo -e "${YELLOW}Testing connection...${NC}"
        RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$NGROK_URL/atlassian-connect-bypass.json" -H "User-Agent: Mozilla/5.0" -H "ngrok-skip-browser-warning: true")
        if [ "$RESPONSE" == "200" ]; then
            echo -e "${GREEN}Connection successful!${NC}"
            echo -e "${YELLOW}To install the app in Confluence, use this URL:${NC}"
            echo -e "${GREEN}$NGROK_URL/atlassian-connect-bypass.json${NC}"
            
            # Also suggest the installation helper
            echo -e "${YELLOW}Or use the installation helper:${NC}"
            echo -e "${GREEN}node install.js${NC}"
            
            # Or open the browser directly
            echo -e "${YELLOW}Or open this in your browser:${NC}"
            echo -e "${GREEN}$NGROK_URL/skip-ngrok.html${NC}"
            break
        else
            echo -e "${RED}Connection failed with status code: $RESPONSE${NC}"
            echo -e "${YELLOW}Retrying in 2 seconds...${NC}"
            sleep 2
            RETRY=$((RETRY+1))
        fi
    else
        echo -e "${RED}Failed to get ngrok URL. Retrying...${NC}"
        sleep 2
        RETRY=$((RETRY+1))
    fi
done

if [ $RETRY -eq $MAX_RETRIES ]; then
    echo -e "${RED}Failed to get ngrok URL after $MAX_RETRIES attempts.${NC}"
    echo -e "${YELLOW}Please check if ngrok is running properly.${NC}"
    echo -e "${YELLOW}You can try manually checking: http://localhost:4040${NC}"
fi

echo -e "${YELLOW}Setup process completed.${NC}"
echo -e "${GREEN}Server and ngrok are running in the background.${NC}"
echo -e "${YELLOW}To view the ngrok setup guide, visit:${NC}"
echo -e "${GREEN}http://localhost:3000/ngrok-setup${NC}"

# Keep this script running to keep the background processes alive
echo -e "${YELLOW}Press Ctrl+C to stop all processes.${NC}"
wait 