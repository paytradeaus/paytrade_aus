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
  cd /home/runner/workspace/front-end && npx next start -p 5001 -H 0.0.0.0
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

WARMUP_ROUTES=(
  "/"
  "/pricing"
  "/blog"
  "/how-to-guides"
  "/support"
  "/login"
  "/signup"
  "/user/dashboard"
  "/user/projects"
  "/user/payments-list"
  "/user/contracts"
  "/user/bank-accounts"
  "/user/trust-accounting"
  "/user/notices"
  "/user/claims"
  "/user/select-profile"
  "/admin/dashboard"
  "/admin/users"
  "/admin/admin-users"
  "/admin/subscriptions"
)

warmup_frontend() {
  echo "[$(date -u)] Warming up frontend routes to pre-cache modules..."
  local failed_routes=()
  for route in "${WARMUP_ROUTES[@]}"; do
    local status
    status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "http://127.0.0.1:5001${route}")
    if [ "$status" -ge 500 ]; then
      echo "[$(date -u)] WARMUP FAIL: ${route} -> ${status}"
      failed_routes+=("$route")
    else
      echo "[$(date -u)] Warmup OK: ${route} -> ${status}"
    fi
  done

  if [ ${#failed_routes[@]} -gt 0 ]; then
    echo "[$(date -u)] WARNING: ${#failed_routes[@]} routes failed warmup: ${failed_routes[*]}"
    echo "[$(date -u)] Retrying failed routes after 3s pause..."
    sleep 3
    local still_failing=0
    for route in "${failed_routes[@]}"; do
      local status
      status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "http://127.0.0.1:5001${route}")
      if [ "$status" -ge 500 ]; then
        echo "[$(date -u)] WARMUP RETRY FAIL: ${route} -> ${status}"
        still_failing=$((still_failing + 1))
      else
        echo "[$(date -u)] Warmup retry OK: ${route} -> ${status}"
      fi
    done
    if [ $still_failing -gt 0 ]; then
      echo "[$(date -u)] $still_failing routes still failing after retry - EIO likely. Restarting frontend..."
      pkill -f "next start" 2>/dev/null || true
      sleep 2
      return 1
    fi
  fi
  echo "[$(date -u)] All routes warmed up successfully."
  return 0
}

for attempt in 1 2 3; do
  echo "[$(date -u)] Frontend warmup attempt $attempt/3..."
  if warmup_frontend; then
    break
  fi
  if [ $attempt -lt 3 ]; then
    echo "[$(date -u)] Waiting for frontend restart..."
    for i in {1..30}; do
      if curl -s http://127.0.0.1:5001 > /dev/null 2>&1; then
        echo "Frontend is back up!"
        break
      fi
      sleep 2
    done
  else
    echo "[$(date -u)] Frontend warmup failed after 3 attempts. Continuing anyway."
  fi
done

echo "All services started. Proxy PID=$PROXY_PID, Backend PID=$BACKEND_PID, Frontend PID=$FRONTEND_PID"

wait $PROXY_PID
