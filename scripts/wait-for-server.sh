#!/bin/bash

# Health check script for the development server
# Usage: ./scripts/wait-for-server.sh [port] [timeout]

PORT=${1:-5173}
TIMEOUT=${2:-60}

echo "Waiting for server on port $PORT (timeout: ${TIMEOUT}s)..."

for i in $(seq 1 $((TIMEOUT / 2))); do
  # Primary check: netcat
  if command -v nc >/dev/null 2>&1; then
    if nc -z localhost $PORT 2>/dev/null; then
      echo "Server is ready on port $PORT after $((i * 2))s!"
      exit 0
    fi
  fi
  
  # Fallback 1: wget
  if command -v wget >/dev/null 2>&1; then
    if wget -q --spider --timeout=2 http://localhost:$PORT 2>/dev/null; then
      echo "Server is ready on port $PORT after $((i * 2))s!"
      exit 0
    fi
  fi
  
  # Fallback 2: curl
  if command -v curl >/dev/null 2>&1; then
    if curl -s --max-time 2 http://localhost:$PORT >/dev/null 2>&1; then
      echo "Server is ready on port $PORT after $((i * 2))s!"
      exit 0
    fi
  fi
  
  # Fallback 3: basic TCP socket check (bash built-in)
  if timeout 2 bash -c "echo > /dev/tcp/localhost/$PORT" 2>/dev/null; then
    echo "Server is ready on port $PORT after $((i * 2))s!"
    exit 0
  fi
  
  echo "Waiting for server... (${i}/$((TIMEOUT / 2)))"
  sleep 2
done

echo "ERROR: Server failed to start within ${TIMEOUT} seconds"
echo "Debug info:"
echo "Port $PORT status:"
ss -tlnp 2>/dev/null | grep ":$PORT " || netstat -tlnp 2>/dev/null | grep ":$PORT " || echo "Port not found in netstat/ss"
echo "Process list:"
ps aux | grep -E "(vite|node)" | grep -v grep || echo "No vite/node processes found"
exit 1