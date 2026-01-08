#!/bin/bash

cd /home/runner/workspace/back-end
npm run start:prod &
BACKEND_PID=$!

echo "Waiting for backend to start on port 3001..."
for i in {1..60}; do
  if curl -s http://127.0.0.1:3001/graphql -X POST -H "Content-Type: application/json" -d '{"query":"{ __typename }"}' > /dev/null 2>&1; then
    echo "Backend is ready!"
    break
  fi
  sleep 1
done

cd /home/runner/workspace/front-end
exec npm run start
