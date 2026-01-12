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

echo "Starting frontend on port 5001..."
cd /home/runner/workspace/front-end && PORT=5001 npm run start &

echo "Waiting for frontend to be ready on port 5001..."
for i in {1..30}; do
  if curl -s http://127.0.0.1:5001 > /dev/null 2>&1; then
    echo "Frontend is ready!"
    break
  fi
  echo "Waiting... ($i/30)"
  sleep 2
done

echo "Starting production proxy on port 5000..."
cd /home/runner/workspace && exec node production-server.js
