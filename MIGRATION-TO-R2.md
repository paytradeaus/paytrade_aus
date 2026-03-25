# PayTrade Migration: Replit → Cloudflare R2 + External Host

## Current Architecture
- **Frontend**: Next.js 14 on port 5001
- **Backend**: NestJS on port 3001
- **Proxy**: Node.js production-server.js on port 5000 (handles EIO retries, maintenance pages, health checks)
- **Database**: PostgreSQL (Replit-managed)
- **Queue**: Redis + BullMQ
- **File Storage**: Replit Object Storage (`@replit/object-storage`)
- **Email**: Brevo SMTP + Mailgun
- **Payments**: Stripe
- **Accounting**: Xero integration (OAuth + webhooks)
- **Error Tracking**: Sentry
- **Analytics**: Google Analytics, GTM, Cookiebot

## Post-Migration Architecture
- **Frontend + Backend**: Railway (or Render/Fly.io)
- **Database**: Railway PostgreSQL (or external managed Postgres)
- **Queue**: Railway Redis (or Upstash)
- **File Storage**: Cloudflare R2 (S3-compatible)
- **Everything else**: Unchanged (Stripe, Xero, Brevo, Sentry, etc.)
- **No more**: production-server.js proxy, EIO workarounds, warmup scripts

---

## FULL SECRETS INVENTORY

### Backend Secrets (set on Railway)
| Variable | Current Source | Notes |
|---|---|---|
| `DATABASE_URL` | Replit PostgreSQL | New Railway Postgres URL |
| `REDIS_URL` | Replit Redis | New Railway Redis URL |
| `STRIPE_SECRET_KEY` | Replit secret | Copy as-is |
| `STRIPE_WEBHOOK_SECRET` | Stripe dashboard | Generate NEW secret for new webhook URL |
| `XERO_CLIENT_ID` | Replit secret | Copy as-is |
| `XERO_CLIENT_SECRET` | Replit secret | Copy as-is |
| `XERO_CALLBACK_URL` | Replit secret | Change to `https://paytrade.app/` |
| `XERO_WEBHOOK_KEY` | Replit secret | Copy as-is (unless Xero requires re-registration) |
| `WEBHOOK_RELAY_SECRET` | Replit secret | Copy as-is |
| `SUPPORT_WEBHOOK_KEY` | Replit secret | Copy as-is |
| `OPENAI_API_KEY` | Replit secret | Copy as-is |
| `BREVO_EMAIL_LOGIN` | Replit secret | Copy as-is |
| `BREVO_EMAIL_PASSWORD` | Replit secret | Copy as-is |
| `ADMIN_ALERT_EMAILS` | Replit secret | Copy as-is |
| `BULL_USER` | Replit secret | Copy as-is |
| `BULL_PASSWORD` | Replit secret | Copy as-is |
| `RECAPTCHA_SECRET_KEY` | Replit secret | Copy as-is |
| `UPLOAD_BASE_URL` | Replit secret | Change to R2 public URL |
| `LOG_BASE_URL` | Replit secret | Change to R2 public URL or internal path |
| `LOG_DELETION_DAYS` | Replit config | Copy as-is (default 30) |
| `NODE_ENV` | Set to `production` | |
| `PORT` | Set to `3001` | |
| `R2_ACCOUNT_ID` | NEW | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | NEW | R2 API token key |
| `R2_SECRET_ACCESS_KEY` | NEW | R2 API token secret |
| `R2_BUCKET_NAME` | NEW | e.g. `paytrade-files` |
| `R2_PUBLIC_URL` | NEW | R2 custom domain or public bucket URL |

### Frontend Secrets (set on Railway or in build env)
| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_GRAPHQL_URI` | Change to `https://paytrade.app/graphql` (or backend URL) |
| `NEXT_PUBLIC_SOCKET_URL` | Change to backend WebSocket URL |
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
| `REPLIT_DEPLOYMENT` | Replace with `NODE_ENV === 'production'` check |
| `REPLIT_DEV_DOMAIN` | Not needed off Replit |
| `REPLIT_DOMAINS` | Not needed off Replit |

---

## WEBHOOK INVENTORY

### Webhooks that need URL updates on external dashboards

| Service | Current Webhook URL | New Webhook URL | Where to Change |
|---|---|---|---|
| **Stripe** | `https://paytrade.app/stripe-webhook` | Same (if domain stays) | Stripe Dashboard → Webhooks |
| **Xero** | `https://paytrade.app/xero-webhook` | Same (if domain stays) | Xero Developer Portal → App → Webhooks |
| **Xero OAuth callback** | Uses `XERO_CALLBACK_URL` env var + `xero/callback` | Update env var | Xero Developer Portal → App → Redirect URIs |
| **Brevo inbound** | `https://paytrade.app/support-mail-brevo` | Same (if domain stays) | Brevo Dashboard → Inbound Parsing |
| **Support ticket** | `https://paytrade.app/support-ticket/webhook` | Same (if domain stays) | Wherever configured |

**Key insight**: If `paytrade.app` DNS points to the new host, all webhook URLs stay the same. No changes needed in Stripe/Xero/Brevo dashboards — they'll just resolve to the new server instead of Replit.

---

## THIRD-PARTY DASHBOARD UPDATES

| Service | What to Check | Action |
|---|---|---|
| **Google reCAPTCHA** | Allowed domains | Verify `paytrade.app` is listed (should already be) |
| **Google Places API** | API key restrictions | Verify domain restriction includes `paytrade.app` |
| **Cookiebot** | Registered domains | Verify `paytrade.app` is registered (should already be) |
| **Sentry** | Allowed origins | Verify DSN accepts requests from new server IP |
| **Stripe** | Webhook signing secret | Only regenerate if creating a new webhook endpoint |
| **Xero** | Redirect URI | Must match `XERO_CALLBACK_URL` exactly |
| **Brevo** | Sending domain | Verify SPF/DKIM records stay valid (DNS dependent) |
| **Google Analytics/GTM** | Data streams | No change needed — tied to domain, not server |

**Firebase**: Not used. No Firebase packages, no Firebase Auth, no FCM, no Firestore.

**Social Login**: Not used. Auth is internal JWT only. Xero OAuth is for accounting integration, not user login.

**Push Notifications**: Not used. Real-time is via Socket.io.

---

## STEP-BY-STEP MIGRATION

### Step 1: Set Up Cloudflare R2 (15 min)

1. Log into Cloudflare dashboard
2. Go to R2 → Create Bucket → name it `paytrade-files`
3. Create an API token: R2 → Manage R2 API Tokens → Create
   - Permissions: Object Read & Write
   - Save the `Access Key ID` and `Secret Access Key`
4. Optionally set up a custom domain for public file access (e.g. `files.paytrade.app`)
5. Note down: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`

### Step 2: Swap ObjectStorageService to S3-Compatible (30 min)

The entire app uses one abstraction: `back-end/src/libs/@object-storage/object-storage.service.ts`

Replace `@replit/object-storage` with `@aws-sdk/client-s3`:

```
npm install @aws-sdk/client-s3
npm uninstall @replit/object-storage
```

Rewrite the service to use the S3 SDK with R2 endpoint:
- `uploadFile` → `PutObjectCommand`
- `downloadFile` → `GetObjectCommand`
- `deleteFile` → `DeleteObjectCommand`
- `listFiles` → `ListObjectsV2Command`
- `fileExists` → `HeadObjectCommand`

The R2 endpoint format: `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`

All callers of `ObjectStorageService` remain unchanged — they use the same method signatures.

### Step 3: Replace REPLIT_DEPLOYMENT Checks (10 min)

Find and replace across backend:
- `process.env.REPLIT_DEPLOYMENT === '1'` → `process.env.NODE_ENV === 'production'`

Files to update:
- `back-end/src/app.module.ts` (Redis TLS config)
- `back-end/src/libs/@keep-alive/keep-alive.service.ts`
- `back-end/src/libs/@database-backup/database-backup.service.ts`
- `back-end/src/libs/@loggers/logger.service.ts`
- `back-end/src/api/common/xero-webhooks/webhook.service.ts` (queue vs sync processing)

Also update `back-end/src/libs/@object-storage/object-storage.service.ts` to remove `REPLIT_DEV_DOMAIN` / `REPLIT_DOMAINS` references — use `UPLOAD_BASE_URL` or `R2_PUBLIC_URL` instead.

### Step 4: Simplify Production Start Scripts (10 min)

On Railway, you don't need:
- `production-server.js` (no EIO proxy needed)
- `start-production.sh` (no warmup/restart loops needed)
- The maintenance page / loading retry page

Railway start command for backend:
```
cd back-end && npm run start:prod
```

Railway start command for frontend:
```
cd front-end && npx next start -p 5001 -H 0.0.0.0
```

Or run both from a simple script without the EIO workarounds.

If running as a single Railway service, use a Procfile or simple start script:
```bash
#!/bin/bash
cd /app/back-end && npm run start:prod &
cd /app/front-end && npx next start -p 5001 -H 0.0.0.0 &
wait
```

Alternatively, run frontend and backend as two separate Railway services for better scaling.

### Step 5: Set Up Railway Project (20 min)

1. Create Railway account → New Project
2. Connect to GitHub repo
3. Add PostgreSQL service → get `DATABASE_URL`
4. Add Redis service → get `REDIS_URL`
5. Add web service from repo
6. Set all environment variables from the secrets inventory above
7. Configure build command: `cd front-end && npm run build && cd ../back-end && npm run build`
8. Configure start command (see Step 4)
9. Set port to 5000 (or whichever port Railway expects)

### Step 6: Migrate Database (20 min)

1. Export from Replit PostgreSQL:
   ```
   pg_dump $DATABASE_URL --no-owner --no-acl > paytrade-dump.sql
   ```
2. Import to Railway PostgreSQL:
   ```
   psql $RAILWAY_DATABASE_URL < paytrade-dump.sql
   ```
3. Run any pending migrations:
   ```
   psql $RAILWAY_DATABASE_URL < scripts/migrate-production.sql
   ```
4. Verify data: spot-check users, companies, subscriptions tables

### Step 7: Migrate Files from Replit Object Storage to R2 (30 min)

Write a one-time migration script:
1. List all files in Replit Object Storage
2. Download each file
3. Upload to R2 with the same key/path

This preserves all existing file paths so database references remain valid.

Key folders to migrate:
- `profile_photo/`
- `company_logo/`
- `contracts/`
- `bank_statements/`
- `audit_reports/`
- `notice-templates/`
- `notices-generated/`
- `application-logs/`
- `database-backups/`

### Step 8: Test on Railway (30 min)

Use a staging subdomain (e.g. `staging.paytrade.app`) pointing to Railway.

Test checklist:
- [ ] App loads without 500/EIO errors
- [ ] Login works (JWT auth)
- [ ] Dashboard loads and shows data
- [ ] File upload works (profile photo, documents)
- [ ] File download/viewing works
- [ ] PDF generation (Puppeteer — may need Chromium on Railway)
- [ ] Stripe payment flow
- [ ] Stripe webhook fires correctly
- [ ] Xero OAuth connect flow
- [ ] Xero webhook receives events
- [ ] Email sending (Brevo)
- [ ] Support form with reCAPTCHA
- [ ] Community bot cron job runs
- [ ] Database backup cron runs
- [ ] WebSocket connections work
- [ ] Admin panel fully functional
- [ ] SEO pages / sitemap loads

### Step 9: Puppeteer Check (10 min)

PayTrade uses Puppeteer for PDF generation. On Railway:
- Install Chromium via buildpack or Dockerfile
- Set `PUPPETEER_EXECUTABLE_PATH` if needed
- Railway supports buildpacks: `heroku/nodejs` + `puppeteer` buildpack
- Alternatively, use `@sparticuz/chromium` package for serverless-friendly Chromium

### Step 10: DNS Cutover (5 min + propagation wait)

1. In your DNS provider (Cloudflare, Namecheap, etc.):
   - Change `paytrade.app` A/CNAME record to point to Railway's provided domain
   - Keep TTL low (300s) before cutover for fast propagation
2. On Replit, the published deployment becomes your staging environment
   - Point a staging subdomain to it (e.g. `staging.paytrade.app`)
   - Or just use Replit's default `.replit.app` domain

Since `paytrade.app` will now resolve to Railway:
- All webhook URLs stay the same (Stripe, Xero, Brevo — no dashboard changes needed)
- OAuth callback URLs stay the same
- reCAPTCHA, Google Places, Cookiebot — all domain-bound, no changes needed
- Analytics continues working — tied to the domain

### Step 11: Post-Cutover Verification (15 min)

1. Verify the site loads on `paytrade.app` via Railway
2. Trigger a Stripe test webhook from Stripe dashboard → verify it arrives
3. Test Xero OAuth flow end-to-end
4. Upload a file → verify it lands in R2
5. Generate a PDF notice → verify it works
6. Check cron jobs are running (community bot, DB backup, log cleanup)
7. Monitor for 30 minutes — no EIO errors should appear

### Step 12: Configure Replit as Staging (5 min)

1. Update Replit's `NEXT_PUBLIC_DEPLOYED_URL` to staging domain
2. Keep Replit's database as staging database (separate from production)
3. Dev workflow stays as-is — code in Replit, push to GitHub, Railway auto-deploys

---

## THINGS THAT JUST WORK (No Changes Needed)

- Stripe keys (same keys, same domain)
- Google Analytics / GTM (domain-based)
- Cookiebot (domain-based, `paytrade.app` already registered)
- Sentry (DSN-based, server IP doesn't matter)
- Brevo SMTP sending (credential-based, not domain-bound for sending)
- OpenAI API (key-based)
- Google reCAPTCHA (verify `paytrade.app` is in allowed domains — likely already is)
- Google Places API (verify domain restriction — likely already covers `paytrade.app`)
- All internal JWT auth (no external OAuth for user login)
- Socket.io WebSockets (just works on any host)

## THINGS THAT DISAPPEAR (Not Needed on Railway)

- `production-server.js` (EIO proxy)
- `start-production.sh` (warmup/restart loops)
- EIO auto-restart mechanism
- Loading retry page
- Maintenance page (Railway has its own)
- Route pre-warming
- `x-forwarded-host` stripping
- Keep-alive service (Railway manages process lifecycle)

---

## TIMELINE ESTIMATE

| Step | Time |
|---|---|
| 1. Set up R2 bucket + API token | 15 min |
| 2. Rewrite ObjectStorageService for S3/R2 | 30 min |
| 3. Replace REPLIT_DEPLOYMENT checks | 10 min |
| 4. Simplify start scripts | 10 min |
| 5. Set up Railway project + env vars | 20 min |
| 6. Migrate database | 20 min |
| 7. Migrate files to R2 | 30 min |
| 8. Test everything | 30 min |
| 9. Puppeteer setup | 10 min |
| 10. DNS cutover | 5 min + propagation |
| 11. Post-cutover verification | 15 min |
| 12. Configure Replit as staging | 5 min |
| **Total active work** | **~3 hours** |
| **DNS propagation wait** | Up to 24-48 hours (usually <1 hour with low TTL) |
