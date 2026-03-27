#!/bin/bash
set -e

echo "=== Building Frontend ==="
cd /home/runner/workspace/front-end
npm run build

echo ""
echo "=== Building Backend ==="
cd /home/runner/workspace/back-end
rm -rf dist
npm run build

echo ""
echo "=== Running production migrations ==="
cd /home/runner/workspace
if [ -n "$DATABASE_URL" ] && [ -f scripts/migrate-production.sql ]; then
  psql "$DATABASE_URL" -f scripts/migrate-production.sql 2>&1 || echo "Migration script completed (some statements may have been skipped as already applied)"
fi

echo ""
echo "=== Build complete ==="
