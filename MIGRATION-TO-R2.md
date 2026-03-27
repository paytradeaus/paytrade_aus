# PayTrade Migration Plan: Multi-Environment Setup

## Target Architecture

| Environment | Platform | Database | Redis | File Storage | Domain |
|---|---|---|---|---|---|
| **Dev** | Replit (workflows) | Replit PostgreSQL | Local Redis | Cloudflare R2 | `*.replit.dev` |
| **Staging** | Replit (published) | Replit PostgreSQL | Replit Redis | Cloudflare R2 | `staging.paytrade.app` or `*.replit.app` |
| **Production** | Railway | Railway PostgreSQL | Railway Redis | Cloudflare R2 | `paytrade.app` |

All three environments share the same R2 bucket (using path prefixes or the same flat structure) — or use separate buckets per environment if preferred.

---

## PROGRESS TRACKER

| Step | Status | Notes |
|---|---|---|
| 1. Set up Cloudflare R2 | DONE | Bucket `paytrade` created, API tokens configured |
| 2. Rewrite ObjectStorageService for R2 | DONE | `@aws-sdk/client-s3`, Replit read-fallback retained |
| 3. Replace REPLIT_DEPLOYMENT checks | DONE | All replaced with `NODE_ENV === 'production'` |
| 4. Migrate existing files to R2 | DONE | Auto-runs on publish via `start-production.sh` |
| 5. Update PaytradeLogger for R2 | DONE | Logs flush to R2 in production |
| 6. Fix production build output | DONE | `tsconfig.build.json` fixed, `dist/main.js` correct |
| 7. Create Dockerfile for Railway | TODO | |
| 8. Create `railway.toml` config | TODO | |
| 9. Set up Railway project + services | TODO | PostgreSQL + Redis + Web service |
| 10. Migrate database to Railway | TODO | pg_dump from Replit → import to Railway |
| 11. Puppeteer / Chromium on Railway | TODO | Dockerfile needs Chromium |
| 12. Configure staging on Replit | TODO | Separate env vars for staging domain |
| 13. DNS cutover | TODO | Point `paytrade.app` to Railway |
| 14. Post-cutover verification | TODO | Full test checklist |
| 15. Remove Replit-only code | TODO | After Railway is stable |

---

## FULL SECRETS INVENTORY

### Backend Secrets (set on Railway)
| Variable | Current Source | Railway Action |
|---|---|---|
| `DATABASE_URL` | Replit PostgreSQL | Railway Postgres URL (auto-provided) |
| `REDIS_URL` | Replit Redis | Railway Redis URL (auto-provided) |
| `STRIPE_SECRET_KEY` | Replit secret | Copy as-is |
| `STRIPE_WEBHOOK_SECRET` | Stripe dashboard | Same if domain stays `paytrade.app` |
| `XERO_CLIENT_ID` | Replit secret | Copy as-is |
| `XERO_CLIENT_SECRET` | Replit secret | Copy as-is |
| `XERO_CALLBACK_URL` | Replit secret | Keep `https://paytrade.app/` |
| `XERO_WEBHOOK_KEY` | Replit secret | Copy as-is |
| `WEBHOOK_RELAY_SECRET` | Replit secret | Copy as-is |
| `SUPPORT_WEBHOOK_KEY` | Replit secret | Copy as-is |
| `OPENAI_API_KEY` | Replit secret | Copy as-is |
| `BREVO_EMAIL_LOGIN` | Replit secret | Copy as-is |
| `BREVO_EMAIL_PASSWORD` | Replit secret | Copy as-is |
| `ADMIN_ALERT_EMAILS` | Replit secret | Copy as-is |
| `BULL_USER` | Replit secret | Copy as-is |
| `BULL_PASSWORD` | Replit secret | Copy as-is |
| `RECAPTCHA_SECRET_KEY` | Replit secret | Copy as-is |
| `UPLOAD_BASE_URL` | Replit secret | Keep or update to R2 public URL |
| `LOG_DELETION_DAYS` | Replit config | Copy as-is (default 30) |
| `NODE_ENV` | — | Set to `production` |
| `PORT` | — | Set to `3001` |
| `R2_ACCOUNT_ID` | Replit secret | Copy as-is |
| `R2_ACCESS_KEY_ID` | Replit secret | Copy as-is |
| `R2_SECRET_ACCESS_KEY` | Replit secret | Copy as-is |
| `R2_BUCKET_NAME` | Replit secret | Copy as-is (`paytrade`) |
| `R2_PUBLIC_URL` | Replit secret | Copy as-is (optional) |

### Frontend Secrets (build-time on Railway)
| Variable | Railway Value |
|---|---|
| `NEXT_PUBLIC_GRAPHQL_URI` | `https://paytrade.app/graphql` |
| `NEXT_PUBLIC_SOCKET_URL` | `https://paytrade.app` |
| `NEXT_PUBLIC_DEPLOYED_URL` | `https://paytrade.app` |
| `NEXT_PUBLIC_GOOGLE_PLACES_API_KEY` | Copy as-is |
| `NEXT_PUBLIC_RECAPTCHA_KEY` | Copy as-is |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Copy as-is |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Copy as-is |
| `NEXT_PUBLIC_GTM_ID` | Copy as-is |
| `NEXT_PUBLIC_COOKIE_BOT_ID` | Copy as-is |
| `NEXT_PUBLIC_SENTRY_AUTH_TOKEN` | Copy as-is |

### Secrets NOT Needed on Railway
| Variable | Why |
|---|---|
| `REPLIT_DEPLOYMENT` | Already replaced with `NODE_ENV === 'production'` |
| `REPLIT_DEV_DOMAIN` | Replit-specific, removed from code |
| `REPLIT_DOMAINS` | Replit-specific, removed from code |

---

## WEBHOOK INVENTORY

| Service | Webhook URL | Action Required |
|---|---|---|
| **Stripe** | `https://paytrade.app/stripe-webhook` | None — domain stays same |
| **Xero** | `https://paytrade.app/xero-webhook` | None — domain stays same |
| **Xero OAuth** | `XERO_CALLBACK_URL` env var | None — already `https://paytrade.app/` |
| **Brevo inbound** | `https://paytrade.app/support-mail-brevo` | None — domain stays same |
| **Support ticket** | `https://paytrade.app/support-ticket/webhook` | None — domain stays same |

Since `paytrade.app` DNS simply moves from Replit to Railway, all webhook URLs remain valid. No third-party dashboard changes needed.

---

## THIRD-PARTY DASHBOARD CHECKS

| Service | What to Verify |
|---|---|
| Google reCAPTCHA | `paytrade.app` in allowed domains (already is) |
| Google Places API | Domain restriction includes `paytrade.app` (already does) |
| Cookiebot | `paytrade.app` registered (already is) |
| Sentry | DSN works from any server IP (it does) |
| Google Analytics/GTM | Domain-based, no change needed |
| Stripe | Webhook signing secret stays the same |
| Xero | Redirect URI matches `XERO_CALLBACK_URL` |
| Brevo | SPF/DKIM DNS records unaffected |

---

## STEP-BY-STEP MIGRATION

### Phase 1: Code Preparation (COMPLETE)

- [x] Set up Cloudflare R2 bucket and API tokens
- [x] Rewrite `ObjectStorageService` to use `@aws-sdk/client-s3` with R2
- [x] Add Replit Object Storage read-fallback for migration period
- [x] Replace all `REPLIT_DEPLOYMENT` checks with `NODE_ENV === 'production'`
- [x] Remove `REPLIT_DEV_DOMAIN` / `REPLIT_DOMAINS` references from backend
- [x] Update `PaytradeLogger` to use R2 instead of Replit Object Storage
- [x] Create and run migration script (Replit → R2 file copy)
- [x] Fix production build output (`tsconfig.build.json`)
- [x] Verify R2 connectivity (upload/download/delete tested)
- [x] Publish and confirm migration runs on deploy

### Phase 2: Railway Setup

#### Step 7: Create Dockerfile

Railway needs a Dockerfile since the app uses Puppeteer (requires Chromium).

```dockerfile
FROM node:20-slim

RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    libnss3 \
    libxss1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libgtk-3-0 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

WORKDIR /app

COPY package*.json ./
COPY front-end/package*.json ./front-end/
COPY back-end/package*.json ./back-end/

RUN cd front-end && npm install --legacy-peer-deps
RUN cd back-end && npm install --legacy-peer-deps

COPY . .

RUN cd front-end && npm run build
RUN cd back-end && rm -rf dist && npm run build

EXPOSE 3001 5001

CMD ["bash", "start-railway.sh"]
```

#### Step 8: Create `railway.toml`

```toml
[build]
dockerfilePath = "Dockerfile"

[deploy]
healthcheckPath = "/health"
healthcheckTimeout = 300
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 5
```

#### Step 9: Create `start-railway.sh`

Simple start script without Replit workarounds:

```bash
#!/bin/bash
export NODE_ENV=production

# Start backend
cd /app/back-end && node dist/main &
BACKEND_PID=$!

# Wait for backend
echo "Waiting for backend..."
for i in {1..30}; do
  if curl -s http://127.0.0.1:3001/health > /dev/null 2>&1; then
    echo "Backend ready!"
    break
  fi
  sleep 2
done

# Start frontend
cd /app/front-end && npx next start -p 5001 -H 0.0.0.0 &
FRONTEND_PID=$!

wait $BACKEND_PID $FRONTEND_PID
```

#### Step 10: Set Up Railway Project

1. Create Railway account → New Project
2. Connect GitHub repo (push code to GitHub first if not already)
3. Add PostgreSQL plugin → auto-provides `DATABASE_URL`
4. Add Redis plugin → auto-provides `REDIS_URL`
5. Add web service from repo
6. Set all environment variables from the secrets inventory above
7. Railway detects the Dockerfile and builds automatically

### Phase 3: Database Migration

#### Step 11: Migrate Database

1. Export from Replit:
   ```bash
   pg_dump "$DATABASE_URL" --no-owner --no-acl > /tmp/paytrade-dump.sql
   ```
2. Import to Railway PostgreSQL:
   ```bash
   psql "$RAILWAY_DATABASE_URL" < /tmp/paytrade-dump.sql
   ```
3. Run pending migrations:
   ```bash
   psql "$RAILWAY_DATABASE_URL" -f scripts/migrate-production.sql
   ```
4. Verify: spot-check users, companies, subscriptions, payments tables

### Phase 4: Testing on Railway

#### Step 12: Test Checklist

Before switching DNS, test on Railway's temporary domain:

- [ ] App loads without errors
- [ ] Login works (JWT auth)
- [ ] Dashboard loads with data
- [ ] File upload works (profile photo, documents)
- [ ] File download/viewing works (from R2)
- [ ] PDF generation (Puppeteer + Chromium)
- [ ] Stripe payment flow
- [ ] Stripe webhook receives events
- [ ] Xero OAuth connect flow
- [ ] Xero webhook receives events
- [ ] Email sending (Brevo)
- [ ] reCAPTCHA validation
- [ ] Community bot cron runs
- [ ] Database backup cron runs
- [ ] WebSocket connections work
- [ ] Admin panel fully functional
- [ ] SEO pages / sitemap loads
- [ ] AI Support assistant works

### Phase 5: DNS Cutover

#### Step 13: Switch DNS

1. Lower TTL to 300s on `paytrade.app` (do this 24h before cutover)
2. Update `paytrade.app` CNAME/A record to point to Railway's domain
3. Wait for propagation (usually <1 hour with low TTL)
4. Verify site loads on `paytrade.app` via Railway

#### Step 14: Post-Cutover Verification

1. Test all webhook flows (Stripe, Xero, Brevo)
2. Upload a file → verify it lands in R2
3. Generate a PDF → verify it works
4. Monitor for 30 minutes — no errors
5. Check cron jobs are running

### Phase 6: Configure Replit Environments

#### Step 15: Configure Replit as Dev + Staging

**Dev environment** (workflows — already working):
- Uses Replit PostgreSQL
- Uses local Redis
- `NODE_ENV=development`
- Same R2 bucket (or a separate `paytrade-dev` bucket)

**Staging environment** (Replit published):
- Uses Replit PostgreSQL (same as dev, or create a second DB)
- Uses Replit Redis
- `NODE_ENV=production`
- Point `staging.paytrade.app` to Replit's `.replit.app` domain
- Or just use the `.replit.app` URL directly for staging

Update Replit's production env vars:
- `NEXT_PUBLIC_DEPLOYED_URL` → `https://staging.paytrade.app`
- `DEPLOYED_URL` → `https://staging.paytrade.app`

### Phase 7: Cleanup

#### Step 16: Remove Replit-Only Code (after Railway stable for 1+ week)

- Remove `@replit/object-storage` fallback from `ObjectStorageService`
- Remove `production-server.js`
- Remove `start-production.sh` (keep for Replit staging, or simplify)
- Remove EIO retry/maintenance page code
- Remove keep-alive service
- Remove route pre-warming
- Remove `@replit/object-storage` from `package.json`
- Clean up migration script from `start-production.sh`

---

## THINGS THAT JUST WORK (No Changes Needed)

- Stripe keys (same keys, same domain)
- Google Analytics / GTM (domain-based)
- Cookiebot (domain-based)
- Sentry (DSN-based)
- Brevo SMTP (credential-based)
- OpenAI API (key-based)
- Google reCAPTCHA (domain `paytrade.app` already allowed)
- Google Places API (domain restriction already covers `paytrade.app`)
- JWT auth (internal, no external OAuth for user login)
- Socket.io WebSockets (works on any host)

## THINGS THAT DISAPPEAR ON RAILWAY

- `production-server.js` (EIO proxy)
- `start-production.sh` (warmup/restart loops)
- EIO auto-restart mechanism
- Loading retry page
- Maintenance page
- Route pre-warming
- `x-forwarded-host` stripping
- Keep-alive service

---

## TIMELINE ESTIMATE (Remaining Work)

| Step | Time | Owner |
|---|---|---|
| 7. Create Dockerfile | 15 min | Agent |
| 8. Create railway.toml + start script | 10 min | Agent |
| 9. Set up Railway project + env vars | 20 min | User |
| 10. Push code to GitHub | 10 min | User |
| 11. Migrate database | 20 min | Agent + User |
| 12. Test everything on Railway | 30 min | User |
| 13. DNS cutover | 5 min + propagation | User |
| 14. Post-cutover verification | 15 min | User |
| 15. Configure Replit as staging | 10 min | Agent |
| 16. Remove Replit-only code | 15 min | Agent (after 1 week) |
| **Total remaining** | **~2.5 hours active work** | |
