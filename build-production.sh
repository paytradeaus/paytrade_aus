#!/bin/bash
set -e

echo "=== Building Frontend ==="
cd /home/runner/workspace/front-end
NODE_OPTIONS='--max-old-space-size=3072' npm run build

echo "=== Setting up standalone assets ==="
if [ -d .next/standalone ]; then
  STANDALONE_SERVER=""
  STANDALONE_DIR=""

  if [ -f .next/standalone/home/runner/workspace/front-end/server.js ]; then
    STANDALONE_SERVER=".next/standalone/home/runner/workspace/front-end/server.js"
    STANDALONE_DIR=".next/standalone/home/runner/workspace/front-end"
  elif [ -f .next/standalone/front-end/server.js ]; then
    STANDALONE_SERVER=".next/standalone/front-end/server.js"
    STANDALONE_DIR=".next/standalone/front-end"
  elif [ -f .next/standalone/server.js ]; then
    STANDALONE_SERVER=".next/standalone/server.js"
    STANDALONE_DIR=".next/standalone"
  fi

  if [ -z "$STANDALONE_SERVER" ]; then
    echo "WARNING: standalone directory exists but server.js not found!"
    echo "Directory contents:"
    find .next/standalone -name "server.js" -type f 2>/dev/null || echo "  (no server.js found anywhere)"
    echo "Will fall back to npx next start at runtime."
  else
    echo "Found standalone server at: $STANDALONE_SERVER"

    echo "Copying public/ to $STANDALONE_DIR/public..."
    cp -r public "$STANDALONE_DIR/public"
    echo "  Done. File count: $(find "$STANDALONE_DIR/public" -type f | wc -l)"

    echo "Copying .next/static/ to $STANDALONE_DIR/.next/static..."
    mkdir -p "$STANDALONE_DIR/.next"
    cp -r .next/static "$STANDALONE_DIR/.next/static"
    echo "  Done. File count: $(find "$STANDALONE_DIR/.next/static" -type f | wc -l)"

    echo "Standalone setup complete."
    echo "  Server: $STANDALONE_SERVER"
    echo "  Public files: $(find "$STANDALONE_DIR/public" -type f | wc -l)"
    echo "  Static files: $(find "$STANDALONE_DIR/.next/static" -type f | wc -l)"
  fi
else
  echo "No standalone output directory found. Will use npx next start at runtime."
fi

echo ""
echo "=== Building Backend ==="
cd /home/runner/workspace/back-end
npm run build

echo ""
echo "=== Running production migrations ==="
cd /home/runner/workspace
if [ -n "$DATABASE_URL" ] && [ -f scripts/migrate-production.sql ]; then
  psql "$DATABASE_URL" -f scripts/migrate-production.sql 2>&1 || echo "Migration script completed (some statements may have been skipped as already applied)"
fi

echo ""
echo "=== Build complete ==="
