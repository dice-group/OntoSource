#!/bin/bash

# OntoSource Startup Script
# This script starts both the backend (FastAPI) and frontend (Next.js) services

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${GREEN}Starting OntoSource...${NC}"

# ---------------------------------------------------------------------------
# Locate and initialise conda so this non-interactive shell can use it
# ---------------------------------------------------------------------------
CONDA_BASE=""
for candidate in \
    "$HOME/miniconda3" \
    "$HOME/anaconda3" \
    "/opt/conda" \
    "/usr/local/anaconda3" \
    "/usr/local/miniconda3"; do
    if [ -f "$candidate/etc/profile.d/conda.sh" ]; then
        CONDA_BASE="$candidate"
        break
    fi
done

if [ -z "$CONDA_BASE" ]; then
    echo -e "${RED}ERROR: conda installation not found.${NC}"
    exit 1
fi

# Source conda so that 'conda' and 'conda activate' work in this shell
# shellcheck source=/dev/null
source "$CONDA_BASE/etc/profile.d/conda.sh"

ENV_NAME="ontosource"
ENV_PYTHON="$CONDA_BASE/envs/$ENV_NAME/bin/python"
ENV_PIP="$CONDA_BASE/envs/$ENV_NAME/bin/pip"
ENV_UVICORN="$CONDA_BASE/envs/$ENV_NAME/bin/uvicorn"

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
# Create conda env if needed
# ---------------------------------------------------------------------------
if ! conda env list | grep -q "^${ENV_NAME} "; then
    PKG_COUNT=$(grep -c '.' requirements.txt 2>/dev/null || echo "?")
    echo -e "${YELLOW}Conda environment '${ENV_NAME}' not found. Creating it now...${NC}"

    # Run conda create in background so we can show a spinner.
    # Output is suppressed during spinner; errors are shown on failure.
    conda create -n "$ENV_NAME" python=3.13.7 -y >/tmp/conda_create.log 2>&1 &
    CONDA_PID=$!

    if spin "Creating conda environment..." "$CONDA_PID"; then
        echo -e "${GREEN}✓ Conda environment created${NC}"
    else
        echo -e "${RED}✗ Failed to create conda environment. Log:${NC}"
        cat /tmp/conda_create.log
        exit 1
    fi

    echo -e "${GREEN}Installing ${PKG_COUNT} Python dependencies (this may take several minutes)...${NC}"
    # Use env's pip directly — avoids 'conda run' TTY/stdin deadlocks
    if "$ENV_PIP" install -r requirements.txt; then
        echo -e "${GREEN}✓ Python dependencies installed${NC}"
    else
        echo -e "${RED}✗ pip install failed.${NC}"
        exit 1
    fi
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
(cd services && "$ENV_UVICORN" main:app --reload) &
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
