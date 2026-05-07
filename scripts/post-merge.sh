#!/bin/bash
set -e

echo "[post-merge] Installing backend dependencies..."
cd back-end && npm install --no-audit --no-fund --prefer-offline
cd ..

echo "[post-merge] Installing frontend dependencies..."
cd front-end && npm install --no-audit --no-fund --prefer-offline
cd ..

echo "[post-merge] Done."
