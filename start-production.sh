#!/bin/bash

export NODE_ENV=production

echo "Starting backend on port 3001..."
cd /home/runner/workspace/back-end && PORT=3001 npm run start:prod &

echo "Waiting for backend to be ready on port 3001..."
for i in {1..30}; do
  if curl -s http://127.0.0.1:3001/graphql -X POST -H "Content-Type: application/json" -d '{"query":"{ __typename }"}' > /dev/null 2>&1; then
    echo "Backend is ready!"
    break
  fi
  echo "Waiting... ($i/30)"
  sleep 2
done

FRONTEND_PORT=${PORT:-5000}
echo "Starting frontend on port $FRONTEND_PORT..."
cd /home/runner/workspace/front-end && exec npm run start -- -p $FRONTEND_PORT
