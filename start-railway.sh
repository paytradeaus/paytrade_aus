#!/bin/bash
export NODE_ENV=production

RAILWAY_PORT=${PORT:-5000}
BACKEND_PORT=3001
FRONTEND_PORT=$RAILWAY_PORT

echo "[$(date -u)] Starting PayTrade on Railway..."
echo "  Frontend (public): port $FRONTEND_PORT"
echo "  Backend (internal): port $BACKEND_PORT"

export PORT=$BACKEND_PORT
export BACKEND_URL="http://127.0.0.1:$BACKEND_PORT"
cd /app/back-end && node dist/main &
BACKEND_PID=$!

echo "Waiting for backend on port $BACKEND_PORT..."
for i in {1..60}; do
  HEALTH_RESPONSE=$(curl -sf "http://127.0.0.1:$BACKEND_PORT/health" 2>/dev/null)
  if [ $? -eq 0 ] && echo "$HEALTH_RESPONSE" | grep -q '"status":"ok"'; then
    echo "Backend is ready!"
    break
  fi
  if [ $i -eq 60 ]; then
    echo "Backend failed to start within 120 seconds"
    exit 1
  fi
  sleep 2
done

cd /app/front-end && npx next start -p $FRONTEND_PORT -H 0.0.0.0 &
FRONTEND_PID=$!

echo "Waiting for frontend on port $FRONTEND_PORT..."
for i in {1..30}; do
  if curl -sf "http://127.0.0.1:$FRONTEND_PORT" > /dev/null 2>&1; then
    echo "Frontend is ready!"
    break
  fi
  sleep 2
done

echo "[$(date -u)] All services running. Backend PID=$BACKEND_PID, Frontend PID=$FRONTEND_PID"

wait -n $BACKEND_PID $FRONTEND_PID
exit $?
