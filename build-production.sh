#!/bin/bash
set -e

echo "=== Building Frontend ==="
cd /home/runner/workspace/front-end
NODE_OPTIONS='--max-old-space-size=3072' npm run build

echo "=== Copying static assets for standalone ==="
if [ -d .next/standalone ]; then
  STANDALONE_DIR=""
  if [ -d .next/standalone/front-end ]; then
    STANDALONE_DIR=".next/standalone/front-end"
  else
    STANDALONE_DIR=".next/standalone"
  fi

  cp -r public "$STANDALONE_DIR/public" 2>/dev/null || true
  mkdir -p "$STANDALONE_DIR/.next"
  cp -r .next/static "$STANDALONE_DIR/.next/static" 2>/dev/null || true
  echo "Standalone assets copied to $STANDALONE_DIR"
else
  echo "No standalone output found (dev build?), skipping asset copy"
fi

echo "=== Building Backend ==="
cd /home/runner/workspace/back-end
npm run build

echo "=== Running production migrations ==="
cd /home/runner/workspace
if [ -n "$DATABASE_URL" ] && [ -f scripts/migrate-production.sql ]; then
  psql "$DATABASE_URL" -f scripts/migrate-production.sql 2>/dev/null || echo "Migration script skipped or already applied"
fi

echo "=== Build complete ==="
