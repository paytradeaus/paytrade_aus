#!/bin/bash

export NODE_ENV=production

echo "Starting production proxy on port 5000 immediately..."
cd /home/runner/workspace && NODE_OPTIONS='--max-old-space-size=128' node production-server.js &
PROXY_PID=$!

sleep 2
echo "Proxy started (PID $PROXY_PID), now starting backend..."

start_backend() {
  echo "[$(date -u)] Starting backend on port 3001..."
  cd /home/runner/workspace/back-end && PORT=3001 NODE_OPTIONS='--max-old-space-size=768' npm run start:prod
  local exit_code=$?
  echo "[$(date -u)] Backend exited with code $exit_code"
  return $exit_code
}

start_backend_with_restart() {
  while true; do
    start_backend
    echo "[$(date -u)] Backend crashed. Restarting in 5 seconds..."
    sleep 5
  done
}

start_backend_with_restart &
BACKEND_PID=$!

echo "Waiting for backend to be ready on port 3001..."
for i in {1..60}; do
  if curl -s http://127.0.0.1:3001/graphql -X POST -H "Content-Type: application/json" -d '{"query":"{ __typename }"}' > /dev/null 2>&1; then
    echo "Backend is ready!"
    break
  fi
  echo "Waiting... ($i/60)"
  sleep 2
done

find_standalone_server() {
  local base="/home/runner/workspace/front-end/.next/standalone"
  for candidate in \
    "$base/home/runner/workspace/front-end/server.js" \
    "$base/front-end/server.js" \
    "$base/server.js"; do
    if [ -f "$candidate" ]; then
      echo "$candidate"
      return 0
    fi
  done
  return 1
}

start_frontend() {
  echo "[$(date -u)] Starting frontend on port 5001..."
  cd /home/runner/workspace/front-end

  STANDALONE_SERVER=$(find_standalone_server)
  if [ -n "$STANDALONE_SERVER" ]; then
    echo "[$(date -u)] Using standalone server: $STANDALONE_SERVER"
    PORT=5001 HOSTNAME=0.0.0.0 __NEXT_PRIVATE_ORIGIN=http://localhost:5001 NODE_OPTIONS='--max-old-space-size=512' node "$STANDALONE_SERVER"
  else
    echo "[$(date -u)] No standalone server found, using npx next start..."
    __NEXT_PRIVATE_ORIGIN=http://localhost:5001 NODE_OPTIONS='--max-old-space-size=512' npx next start -p 5001 -H 0.0.0.0
  fi

  local exit_code=$?
  echo "[$(date -u)] Frontend exited with code $exit_code"
  return $exit_code
}

start_frontend_with_restart() {
  while true; do
    start_frontend
    echo "[$(date -u)] Frontend crashed. Restarting in 5 seconds..."
    sleep 5
  done
}

start_frontend_with_restart &
FRONTEND_PID=$!

echo "Waiting for frontend to be ready on port 5001..."
for i in {1..30}; do
  if curl -s http://127.0.0.1:5001 > /dev/null 2>&1; then
    echo "Frontend is ready!"
    break
  fi
  echo "Waiting... ($i/30)"
  sleep 2
done

echo "All services started. Proxy PID=$PROXY_PID, Backend PID=$BACKEND_PID, Frontend PID=$FRONTEND_PID"

wait $PROXY_PID
