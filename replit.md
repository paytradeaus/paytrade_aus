# PayTrade Application

## Overview
PayTrade is a full-stack application designed to streamline payment, invoicing, contract management, and trust accounting specifically for the construction industry. It provides a comprehensive solution for managing financial workflows and ensuring compliance, leveraging modern web technologies for a robust and scalable platform.

## User Preferences
I prefer clear, concise communication. When making changes, prioritize iterative development and explain the high-level approach before diving into specifics. Please ask for confirmation before implementing significant architectural changes or altering core business logic.

## System Architecture
The application features a Next.js frontend and a NestJS backend communicating via a GraphQL API.

**Frontend (Next.js)**
- **Framework**: Next.js 14.2.11 with React 18.
- **State Management**: Redux Toolkit.
- **API Client**: Apollo Client for GraphQL.
- **Styling**: SCSS Modules and standard CSS.
- **UI/UX**: Dynamic pricing tables integrate backend `plan_items` and `pricing_table_feature` data via `getAllPricingTableFeatures` and `getAllSubscriptionPlanListForUser` GraphQL queries. Plan cards deduplicate by name (preferring plans with descriptions) and sort by `unformatted_price` (ascending). Tier-specific styling uses position-based `TIER_SEQUENCE` (first plan = neutral, middle = ocean/blue, top = crab/red) — works with any plan name. `PricingGrid` derives columns dynamically from actual plans returned by API. `planFeaturesGrid` builds columns from `plan_items`. Hardcoded fallback in `data.ts` (`subscriptionPlanFeatures`) used only if API fails. SEO is driven by backend-managed `SeoKeyword` entities.
- **Deployment Stability**: Frontend uses `npx next start` for production. On Replit: auto-restart loops, host header proxying, route pre-warming via `start-production.sh`. On Railway: simplified `start-railway.sh` with Dockerfile.
- **Multi-Environment**: Dev (Replit workflows), Staging (Replit published), Production (Railway). Migration plan in `MIGRATION-TO-R2.md`.

**Backend (NestJS)**
- **Framework**: NestJS.
- **Database**: PostgreSQL with TypeORM.
- **Queue**: BullMQ with Redis for asynchronous jobs.
- **Authentication**: JWT with Passport.
- **File Storage**: Cloudflare R2 (primary) with Replit Object Storage read-fallback for pre-migration files. Managed by `ObjectStorageService` using `@aws-sdk/client-s3`. R2 endpoint: `https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com`, bucket configured via `R2_BUCKET_NAME`. Files served via `DirectFileServeController`. Migration script at `back-end/scripts/migrate-to-r2.ts` copies existing Replit files to R2.
- **Logging**: Custom `PaytradeLogger` writes to local files and Cloudflare R2 (in production).
- **PDF Generation**: Puppeteer generates PDFs, uploaded to Object Storage.
- **Community Bot**: A cron-scheduled module uses OpenAI GPT-4o to generate Q&A content.
- **Monitoring**: A `/health` endpoint checks database connectivity. `production-server.js` monitors both backend and frontend health, sending email alerts on failures. Auto-restart mechanisms (EIO Auto-Restart) are in place for critical errors.
- **Admin User Management**: Comprehensive CRUD for admin users, groups, and permissions, including orphan protection for the last active admin. Features include an Admin Menu Editor, Pricing Table Editor, Holiday table monitoring, a Company Delete function with dependency impact assessment, and a User Export/Import system (JSON format) for migrating user profiles between environments. Export: `adminExportUserData` query exports user_details, company_details, company_user_roles, and subscription_details. Import: `adminImportUserData` mutation creates user with allowlisted fields, validates company mapping by email+name, deduplicates subscriptions, and resets security-sensitive fields. Both are Portal Admin only.
- **SEO Keywords System**: Backend-managed keywords drive dynamic landing pages, with interlinking and admin CRUD functionality including import/export.
- **How-To Guides System**: Guides are stored in `blog_resource` with categorized content, banner images, and admin management including import/export.
- **AI Support Assistant**: A search-first support flow at `/support`. Users search FAQs/guides, then can "Ask PayTrade AI" (OpenAI GPT-4o). Features include rate limiting, a relevance gate, web search enrichment for legal questions, and abuse controls. AI answers are auto-posted to the community. A reusable `AiHelpWidget` component (`front-end/src/components/AiHelpWidget/`) provides a floating "?" button + slide-out panel with the same search→AI flow, currently deployed on all Xero screens via a Next.js layout wrapper (`front-end/src/app/user/(protected)/integrations/xero/layout.tsx`). Accepts a `context` prop for contextual labeling.
- **Smart Reconciliation Matching**: QuickBooks-style smart matching system for bank transactions. Backend: `fetchBatchSuggestedMatches` (query), `batchMatchExactTransactions` (mutation), `quickAdjustAndMatch` (mutation) in `transactions.service.ts`/`resolver.ts`. Frontend: Smart Match toggle in TransactionsList (preference persisted via `getSmartMatchPreference`/`setSmartMatchPreference` GraphQL endpoints, stored in `company_user_roles.email_preferences.smart_match` JSONB). Match quality indicators use existing CSS classes (`valid smallbutton` for exact, `contrast smallbutton` for near). Expandable rows with payment details use `pt_expandtable`/`pt_records`/`rivertext` classes. One-click match/adjust-and-match, and "Match All Exact" batch button. DynamicTable supports `renderExpandedRow` prop. Near-match tolerance configurable via `SMART_MATCH_TOLERANCE` env var (default: $5.00). Quick-adjust auto-creates over/under payments to bridge discrepancies before matching. **Atomicity**: `addPayment` and `matchTxnsToPayments` accept an optional `externalManager?: EntityManager` parameter; when provided, they participate in the caller's transaction instead of creating their own. `quickAdjustAndMatch` wraps both calls in a single outer transaction for true all-or-nothing rollback. Side effects (emails, notices, compliance) are deferred when running inside an external transaction.
- **Xero Bank Account Auto-Create**: Two-way bank account auto-creation between PayTrade and Xero. Xero Settings has `pt_to_xero_bank_auto_create` and `xero_to_pt_bank_auto_create` toggles on `xero_integration_details`. Hourly scheduler (`0 * * * *`) auto-creates unmapped accounts when toggles are enabled. PT→Xero creates full accounts; Xero→PT creates draft accounts requiring gap-fill (account type, financial institution, opening date, etc.) via `completeXeroBankAccountDraft` mutation. Frontend: "Create in Xero" / "Create in PayTrade" row action buttons on bank account mapping tabs with confirmation modals. On bank account save, if Xero is connected, a dialog prompts to create in Xero immediately (Yes/No/dismiss). "No" sets `bank_accounts.skip_xero_auto_create = true` to prevent scheduler re-try. Sync log templates 466-467 for auto-create success/missing-fields. Gap-fill resolution in `resolveByMap.ts` handles `BANK_MISSING_FIELDS` / `SCHEDULER_BANK_MISSING_FIELDS`.
- **Demo/Sandbox Mode**: Per-company demo mode with isolated Stripe test keys. `company_details.is_demo` flags a company as demo; `subscription_plan_details.is_sandbox` flags plans as sandbox. `getStripeInstance(isDemo)` in `stripe-helper.ts` returns live or test Stripe SDK. All payment-gateway, webhook, and subscription operations route through the correct Stripe instance based on company demo status. Admin UI: Business Profile has "Demo Account" toggle, Manage Plans has Live/Sandbox toggle filter. User-facing: `SubscriptionContext` derives `is_demo` from subscription details, passes `is_sandbox` to plan queries so demo companies see only sandbox plans. `addNewPayment.tsx` conditionally loads `NEXT_PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY` for demo companies. Webhook handler tries live secret first, falls back to test. Required env vars for sandbox: `STRIPE_TEST_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY`, `STRIPE_TEST_WEBHOOK_SECRET`.

## External Dependencies
- **PostgreSQL**: Primary application database.
- **Redis**: Used for BullMQ job queuing.
- **Cloudflare R2**: Primary cloud storage for application files and logs (S3-compatible). Replit Object Storage retained as read-fallback during migration.
- **R2 Secrets**: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL` (optional).
- **OpenAI API**: Used for AI content generation and support.
- **Puppeteer**: For PDF document generation.
- **Stripe**: For payment processing.
- **Brevo (formerly Sendinblue)**: For email services.
- **Google Tag Manager, Google Analytics, Cookiebot**: For analytics and cookie consent.