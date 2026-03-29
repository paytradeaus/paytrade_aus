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
- **UI/UX**: Dynamic pricing tables integrate backend `plan_items` and `pricing_table_feature` data via `getAllPricingTableFeatures` and `getAllSubscriptionPlanListForUser` GraphQL queries. Plan cards deduplicate by name (preferring plans with descriptions) and sort by tier order. `PricingCards` accepts any `planType` string; tier-specific styling is mapped in `TIER_STYLES`. CSS classes: `pt_basic`, `pt_standard`, `pt_advanced`, `pt_pro-audit`. Hardcoded fallback in `data.ts` (`subscriptionPlanFeatures`) used only if API fails. SEO is driven by backend-managed `SeoKeyword` entities.
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
- **Admin User Management**: Comprehensive CRUD for admin users, groups, and permissions, including orphan protection for the last active admin. Features include an Admin Menu Editor, Pricing Table Editor, Holiday table monitoring, and a Company Delete function with dependency impact assessment.
- **SEO Keywords System**: Backend-managed keywords drive dynamic landing pages, with interlinking and admin CRUD functionality including import/export.
- **How-To Guides System**: Guides are stored in `blog_resource` with categorized content, banner images, and admin management including import/export.
- **AI Support Assistant**: A search-first support flow at `/support`. Users search FAQs/guides, then can "Ask PayTrade AI" (OpenAI GPT-4o). Features include rate limiting, a relevance gate, web search enrichment for legal questions, and abuse controls. AI answers are auto-posted to the community.
- **Smart Reconciliation Matching**: QuickBooks-style smart matching system for bank transactions. Backend: `fetchBatchSuggestedMatches` (query), `batchMatchExactTransactions` (mutation), `quickAdjustAndMatch` (mutation) in `transactions.service.ts`/`resolver.ts`. Frontend: Smart Match toggle in TransactionsList (preference persisted via `getSmartMatchPreference`/`setSmartMatchPreference` GraphQL endpoints, stored in `company_user_roles.email_preferences.smart_match` JSONB). Match quality indicators use existing CSS classes (`valid smallbutton` for exact, `contrast smallbutton` for near). Expandable rows with payment details use `pt_expandtable`/`pt_records`/`rivertext` classes. One-click match/adjust-and-match, and "Match All Exact" batch button. DynamicTable supports `renderExpandedRow` prop. Near-match tolerance configurable via `SMART_MATCH_TOLERANCE` env var (default: $5.00). Quick-adjust auto-creates over/under payments to bridge discrepancies before matching. **Atomicity**: `addPayment` and `matchTxnsToPayments` accept an optional `externalManager?: EntityManager` parameter; when provided, they participate in the caller's transaction instead of creating their own. `quickAdjustAndMatch` wraps both calls in a single outer transaction for true all-or-nothing rollback. Side effects (emails, notices, compliance) are deferred when running inside an external transaction.

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