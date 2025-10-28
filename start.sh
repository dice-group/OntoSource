#!/bin/bash

# OntoSource Startup Script
# This script starts both the backend (FastAPI) and frontend (Next.js) services

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting OntoSource...${NC}"

# Check if conda environment exists
if ! conda env list | grep -q "ontosource"; then
    echo -e "${YELLOW}Conda environment 'ontosource' not found. Creating it now...${NC}"
    conda create -n ontosource python=3.13.7 -y
    echo -e "${GREEN}Installing Python dependencies...${NC}"
    conda run -n ontosource pip install -r requirements.txt
fi

# Check if node_modules exists in webapp
if [ ! -d "webapp/node_modules" ]; then
    echo -e "${YELLOW}Node modules not found. Installing...${NC}"
    cd webapp
    npm install
    cd ..
fi

# Function to cleanup background processes on exit
cleanup() {
    echo -e "\n${YELLOW}Shutting down services...${NC}"
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    echo -e "${GREEN}Services stopped.${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# Start backend
echo -e "${GREEN}Starting FastAPI backend...${NC}"
cd services
conda run -n ontosource uvicorn main:app --reload &
BACKEND_PID=$!
cd ..
echo -e "${GREEN}Backend started (PID: $BACKEND_PID) at http://localhost:8000${NC}"

# Wait a moment for backend to initialize
sleep 2

# Start frontend
echo -e "${GREEN}Starting Next.js frontend...${NC}"
cd webapp
npm run dev &
FRONTEND_PID=$!
cd ..

# Wait for processes
wait

