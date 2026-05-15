# AI Billing, Credits & Stripe Top-up — Task #161

## Goal
Make AI usage pay-as-you-go on top of subscription plans:

- A platform-wide **user cost multiplier** (admin-configurable, default `1.50×`) is applied to the raw AI provider cost before any credit is consumed.
- Each subscription plan has a **`monthly_ai_credit`** (USD) allotment that is granted to every active company on the 1st of every calendar month. **Credits never roll over.**
- Companies that exceed their allotment can either be blocked (hard mode) or have AI calls **auto top-up** their balance via a stored Stripe payment method, with per-month spend caps and Stripe fees passed through to the customer.
- All purchases are recorded in `ai_credit_purchases`; admins see them in `/admin/ai-purchases` along with revenue / fee / credit totals.

## Storage

| Table | Purpose |
|---|---|
| `ai_credit_ledger` | Append-only per-company event log (`grant`, `consume`, `topup`, `adjustment`, `refund`). Drives balance via cumulative sum. |
| `ai_credit_balances` | Cached current balance per company; updated under row lock inside the same transaction as the ledger insert so no two writers can corrupt the running total. |
| `ai_billing_settings` | Per-company auto-top-up config: trigger, top-up amount, monthly cap, stored Stripe `payment_method_id`, billing email, `is_sandbox`. |
| `ai_credit_purchases` | One row per Stripe PaymentIntent (manual or auto). Includes `credits_purchased_usd`, `stripe_fee_usd`, `amount_charged_usd`, status, failure reason, optional receipt URL. |
| `subscription_plan_details.monthly_ai_credit` | New `numeric(12,2)` column. Default `0`. |
| `common_settings."ai_user_cost_multiplier"` | Single-row admin setting, default `1.50`. |

The migration is **idempotent**: every `CREATE TABLE` and `ALTER TABLE` is wrapped in `IF NOT EXISTS` / `DO` blocks so reruns and partial deploys are safe.

## Service contract — `AiBillingService`

- `getCostMultiplier()` / `setCostMultiplier(value, adminId)`
- `getBalance(companyId)`, `getLedger(companyId, limit)`, `getSettings(companyId)`, `updateSettings(...)`
- `consumeCredit({ companyId, rawCostUsd, aiRunId, idempotencyKey, ... })` — the **only** entry point AI tools should call. Multiplies, locks the balance row, debits, throws `InsufficientCreditException` when balance < cost (callers can decide whether to attempt an auto top-up via `evaluateAutoTopup` + `chargeTopup`).
- `runMonthlyAllocation(period?)` — idempotent on `(company_id, period)`; safe to call from cron, bootstrap, or admin UI.
- `createSetupIntent(companyId, isSandbox)` + `attachPaymentMethod(companyId, paymentMethodId, isSandbox)` — capture and store a card on the existing Stripe customer (re-uses `subscription_details.stripe_customer_id` and the `getStripeInstance(isDemo)` helper).
- `chargeTopup({ companyId, creditsUsd, trigger, isSandbox })` — applies Stripe processing fee via `computeStripeFee`, charges PaymentIntent off-session, records the purchase row, calls the receipt handler on success, and inserts a `topup` ledger entry.
- `evaluateAutoTopup(companyId)` — returns the next charge amount when settings are enabled, balance is below trigger, the company has a stored card, and the current calendar month has not exhausted the cap.

## Schedules — `AiBillingCron`

- `OnApplicationBootstrap` runs a catch-up monthly allocation so first-of-month deploys never miss it.
- `5 0 1 * *` UTC — monthly allocation.
- `*/15 * * * *` UTC — auto top-up scanner. Iterates companies with `auto_topup_enabled = true AND stripe_payment_method_id IS NOT NULL`, evaluates, and charges. Each company is wrapped in its own try/catch so one failure never blocks the rest.

## Receipts — `AiBillingReceiptService`
On every successful purchase the receipt service:
1. Renders an HTML receipt and converts it to PDF via Puppeteer using the same Chromium launch flags as `users/notices/notice-gen-doc.service.ts` (`--no-sandbox --disable-setuid-sandbox --disable-gpu --disable-dev-shm-usage`).
2. Uploads the PDF to Cloudflare R2 (with the standard Replit Object Storage fallback) at `ai-credit-receipts/{purchaseId}.pdf` via `ObjectStorageService.uploadFileDirect`.
3. Persists the resulting public URL on `ai_credit_purchases.receipt_pdf_url` and stamps `receipt_emailed_at`.
4. Queues an email through `EmailQueueProducer` using the inline `header-footer-email` template described in `docs/architecture/email-patterns.md`, embedding the receipt download link. No new DB email template is required.

PDF render failures are logged but never block the receipt email — the user always gets the inline HTML summary even if R2 / Puppeteer is degraded.

## Resolver surface — `AiBillingResolver` (GraphQL)

User / per-company:
- `getAiBillingOverview(company_id)`, `getAiCreditLedger(company_id, limit)`, `getAiCreditPurchases(company_id)`
- `updateAiBillingSettings`, `createAiBillingSetupIntent`, `attachAiBillingPaymentMethod`, `manualAiCreditTopup`

Admin-only (guarded by `JwtAuthGuard` + `decodeJwtToken` admin check):
- `getAiUserCostMultiplier`, `setAiUserCostMultiplier`
- `getAdminAiPurchases(input)` — filter by date range / company / status / `min_amount` / `max_amount`. All filters are applied at the SQL layer via a shared `buildAdminPurchasesQb` so `total_count` matches the filtered set and pagination is accurate; totals are computed with a single aggregate query restricted to `status = 'succeeded'`.
- `exportAdminAiPurchasesCsv(input)` — same filter shape as `getAdminAiPurchases`, returns up to 10k rows as a CSV string with company name, trigger, status, credit/fee/amount, Stripe payment intent and receipt URL columns.
- `runAiCreditMonthlyAllocation(period?)` — manual trigger of the monthly job.

## Pricing & plan editing
- `AddSubscriptionPlanInput` and `UpdateSubscriptionPlanInput` accept `monthly_ai_credit` (typed as `number`, no `as any` casts).
- `getAllSubscriptionPlanListForUser` (free / monthly / yearly), `getSubscriptionDetailsByCompanyId`, the admin business-profile + manage-profile queries and the admin add/update plan query all return `monthly_ai_credit`.
- The plan create + update flows in `pt-subscription.service.ts` persist the value, and the update set-clause only writes the column when the input was provided so omitting the field never zeros it out.
- Frontend surfaces:
  - `front-end/src/modules/user/Subscriptions/planCard.tsx` — renders an "Includes $X/mo AI credits" line on the public pricing grid + the upgrade/downgrade chooser whenever `overallData.monthly_ai_credit > 0`.
  - `front-end/src/modules/user/Subscriptions/billingSummary.tsx` — same line on the current-subscription summary card and the checkout/sandbox preview.
  - `front-end/src/modules/admin/AddUpdatePlan/index.tsx` — `Monthly AI credit (USD)` form input next to `Trial period`, validated via the existing Yup schema (numeric, ≥ 0). Patched values round-trip through `addUpdatePlan.functions.ts` and the `pt-subscription` add/update mutations.

## Authorization tightening
`AiBillingResolver.assertCompanyAccess` requires the JWT to be explicitly pinned to the requested `company_id` for non-admin tokens. Tokens without a `company_id` claim are rejected — the previous "allow when JWT lacks company_id" branch was an IDOR risk and has been removed.

## Seeders (production-safe)

- `AdminMenuSeederService` was extended with menu **`a0000001-0000-0000-0000-000000000023` "AI Purchases"** at `/admin/ai-purchases`. Existing `grantPermissionsToAllGroups()` already grants new menus additively — no group permissions are overwritten.
- `AiCostMultiplierSeederService` inserts the `ai_user_cost_multiplier` row in `common_settings` only if missing, so production-tuned values survive deploys.

## Front-end
- `front-end/src/modules/user/AiBilling/` — credit balance, plan allotment, manual top-up, attach card, auto-top-up settings, ledger and top-up history. Mounted at `/user/ai-billing`.
- `front-end/src/modules/admin/AdminAiPurchases/` — admin cost multiplier editor, totals (revenue / credits / Stripe fees), filterable purchases table. Mounted at `/admin/ai-purchases`.

## Why it's safe to deploy
- The migration only adds tables and a column with safe defaults.
- The cost multiplier seeder is insert-only.
- The admin menu seeder appends the new entry and grants the privilege without touching any existing menu or group.
- All ledger writes are wrapped in `dataSource.transaction(...)` with `SELECT ... FOR UPDATE` on `ai_credit_balances`, plus a `(company_id, idempotency_key)` unique constraint that quietly turns retries into no-ops.
