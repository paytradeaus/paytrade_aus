#!/bin/bash

export NODE_ENV=production

echo "Starting production proxy on port 5000 immediately..."
cd /home/runner/workspace && node production-server.js &
PROXY_PID=$!

sleep 2
echo "Proxy started (PID $PROXY_PID), now starting backend..."

start_backend() {
  echo "[$(date -u)] Starting backend on port 3001..."
  cd /home/runner/workspace/back-end && PORT=3001 npm run start:prod
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

start_frontend() {
  echo "[$(date -u)] Starting frontend on port 5001..."
  cd /home/runner/workspace/front-end

  if [ -f .next/standalone/front-end/server.js ]; then
    echo "[$(date -u)] Using standalone server..."
    PORT=5001 HOSTNAME=0.0.0.0 __NEXT_PRIVATE_ORIGIN=http://localhost:5001 node .next/standalone/front-end/server.js
  elif [ -f .next/standalone/server.js ]; then
    echo "[$(date -u)] Using standalone server (root)..."
    PORT=5001 HOSTNAME=0.0.0.0 __NEXT_PRIVATE_ORIGIN=http://localhost:5001 node .next/standalone/server.js
  else
    echo "[$(date -u)] Using npx next start..."
    __NEXT_PRIVATE_ORIGIN=http://localhost:5001 npx next start -p 5001 -H 0.0.0.0
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
