#!/bin/bash
export NODE_ENV=production

FRONTEND_PORT=${PORT:-5000}
BACKEND_PORT=3001

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

# Task #145 follow-up — auto-run the duplicate Xero contacts cleanup
# on every deploy. The script is idempotent and fail-safe:
#   - Does nothing when there are 0 rows in scope.
#   - Aborts (non-zero exit) without deleting if any targeted rows are
#     still referenced by client_suppliers_details / xero_invoices_bills
#     / xero_payments / xero_sync_logs.
# So a clean DB on a subsequent deploy is a no-op.
#
# Company id is taken from XERO_CONTACTS_CLEANUP_COMPANY_ID; defaults to
# 1012 (Signature Multi-Res Pty Ltd). Set XERO_CONTACTS_CLEANUP=off to
# skip entirely. We never let the cleanup status fail the deploy — the
# app should boot regardless.
CLEANUP_COMPANY_ID="${XERO_CONTACTS_CLEANUP_COMPANY_ID:-1012}"
if [ "${XERO_CONTACTS_CLEANUP:-on}" = "off" ]; then
  echo "[xero-contacts-cleanup] Skipped (XERO_CONTACTS_CLEANUP=off)"
elif [ -z "$CLEANUP_COMPANY_ID" ]; then
  echo "[xero-contacts-cleanup] Skipped (no company id)"
else
  echo "[xero-contacts-cleanup] Running --apply for company_id=$CLEANUP_COMPANY_ID"
  ( cd /app/back-end && node scripts/cleanup-xero-contacts.js \
      --company-id "$CLEANUP_COMPANY_ID" --apply ) || \
    echo "[xero-contacts-cleanup] Non-zero exit (see output above) — continuing deploy."
fi

# Invoke Next.js directly via node — NOT `npx`. The build-stage npm (pinned newer
# in the Dockerfile) is incompatible with this image's Node at runtime and its
# `npx` code path crashes with "Class extends value undefined is not a constructor
# or null", so the frontend never binds and the healthcheck fails. Running the
# next binary under node sidesteps npm/npx entirely (the backend already does the
# same with `node dist/main`).
cd /app/front-end && node node_modules/next/dist/bin/next start -p $FRONTEND_PORT -H 0.0.0.0 &
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
