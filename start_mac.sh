#!/bin/bash

# OntoSource Startup Script for macOS
# This script starts both the backend (FastAPI) and frontend (Next.js) services


# brew install ant

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${GREEN}Starting OntoSource...${NC}"

# ---------------------------------------------------------------------------
# Locate uv so this script can manage the Python environment without conda
# ---------------------------------------------------------------------------
if ! command -v uv >/dev/null 2>&1; then
    echo -e "${RED}ERROR: uv is not installed or not on PATH.${NC}"
    echo -e "${YELLOW}Install it with Homebrew: brew install uv${NC}"
    echo -e "${YELLOW}Or see: https://docs.astral.sh/uv/getting-started/installation/${NC}"
    exit 1
fi

if ! command -v ant >/dev/null 2>&1; then
    echo -e "${RED}ERROR: Apache Ant is required to build jpype1, which is used by owlapy.${NC}"
    echo -e "${YELLOW}Install it with Homebrew: brew install ant${NC}"
    exit 1
fi

ENV_UVICORN="uv run uvicorn"

# ---------------------------------------------------------------------------
# Spinner helper — runs a background PID and shows animation until it exits.
# On failure it prints a message and exits the whole script.
# ---------------------------------------------------------------------------
spin() {
    local msg="$1"
    local pid="$2"
    local frames='⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'
    local i=0
    tput civis 2>/dev/null || true
    while kill -0 "$pid" 2>/dev/null; do
        local frame="${frames:$((i % ${#frames})):1}"
        printf "\r${CYAN}%s${NC} %s " "$frame" "$msg"
        sleep 0.1
        ((i++))
    done
    tput cnorm 2>/dev/null || true
    printf "\r\033[K"
    # Check exit code of the waited process
    wait "$pid"
    return $?
}

# ---------------------------------------------------------------------------
# Create/sync uv virtual environment
# ---------------------------------------------------------------------------
echo -e "${GREEN}Syncing Python dependencies with uv...${NC}"
uv sync >/tmp/uv_sync.log 2>&1 &
UV_PID=$!

if spin "Syncing uv environment..." "$UV_PID"; then
    echo -e "${GREEN}✓ Python dependencies synced${NC}"
else
    echo -e "${RED}✗ uv sync failed. Log:${NC}"
    cat /tmp/uv_sync.log
    exit 1
fi

# ---------------------------------------------------------------------------
# Install Node deps if needed
# ---------------------------------------------------------------------------
if [ ! -d "webapp/node_modules" ]; then
    echo -e "${YELLOW}Node modules not found. Installing...${NC}"
    npm install --prefix webapp >/tmp/npm_install.log 2>&1 &
    NPM_PID=$!
    if spin "Installing Node dependencies..." "$NPM_PID"; then
        echo -e "${GREEN}✓ Node dependencies installed${NC}"
    else
        echo -e "${RED}✗ npm install failed. Log:${NC}"
        cat /tmp/npm_install.log
        exit 1
    fi
fi

# ---------------------------------------------------------------------------
# Cleanup on exit
# ---------------------------------------------------------------------------
cleanup() {
    echo -e "\n${YELLOW}Shutting down services...${NC}"
    [ -n "$BACKEND_PID" ]  && kill "$BACKEND_PID"  2>/dev/null || true
    [ -n "$FRONTEND_PID" ] && kill "$FRONTEND_PID" 2>/dev/null || true
    echo -e "${GREEN}Services stopped.${NC}"
    exit 0
}
trap cleanup SIGINT SIGTERM

# ---------------------------------------------------------------------------
# Start backend (FastAPI)
# ---------------------------------------------------------------------------
echo -e "${GREEN}Starting FastAPI backend...${NC}"
(cd services && $ENV_UVICORN main:app --reload) &
BACKEND_PID=$!

printf "${CYAN}⠋${NC} Waiting for backend..."
for i in $(seq 1 40); do
    sleep 0.5
    if curl -sf http://localhost:8000/docs >/dev/null 2>&1; then
        printf "\r\033[K"
        echo -e "${GREEN}✓ Backend ready at http://localhost:8000${NC}"
        break
    fi
    frames='⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'
    printf "\r${CYAN}${frames:$((i % ${#frames})):1}${NC} Waiting for backend..."
done

# ---------------------------------------------------------------------------
# Start frontend (Next.js)
# ---------------------------------------------------------------------------
echo -e "${GREEN}Starting Next.js frontend...${NC}"
(cd webapp && npm run dev) &
FRONTEND_PID=$!

for i in $(seq 1 60); do
    sleep 0.5
    if curl -sf http://localhost:3000 >/dev/null 2>&1; then
        printf "\r\033[K"
        echo -e "${GREEN}✓ Frontend ready at http://localhost:3000${NC}"
        break
    fi
    frames='⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'
    printf "\r${CYAN}${frames:$((i % ${#frames})):1}${NC} Waiting for frontend..."
done

echo -e "\n${GREEN}OntoSource is running!${NC}"
echo -e "  Backend:  http://localhost:8000"
echo -e "  Frontend: http://localhost:3000"
echo -e "  API docs: http://localhost:8000/docs"
echo -e "\n${YELLOW}Press Ctrl+C to stop.${NC}\n"

# Keep script alive
wait
