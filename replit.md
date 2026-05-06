# PayTrade Application

## Overview
PayTrade is a full-stack application designed to streamline payment, invoicing, contract management, and trust accounting specifically for the construction industry. It provides a comprehensive solution for managing financial workflows, ensuring compliance, and leveraging modern web technologies for a robust and scalable platform. The project aims to be a leading financial management solution in the construction sector, enhancing efficiency and reducing administrative burden for businesses.

## User Preferences
I prefer clear, concise communication. When making changes, prioritize iterative development and explain the high-level approach before diving into specifics. Please ask for confirmation before implementing significant architectural changes or altering core business logic.

## System Architecture
The application features a Next.js frontend and a NestJS backend communicating via a GraphQL API.

**Frontend (Next.js)**
- **Framework**: Next.js 14.2.11 with React 18.
- **State Management**: Redux Toolkit.
- **API Client**: Apollo Client for GraphQL.
- **Styling**: SCSS Modules and standard CSS.
- **UI/UX**: Dynamic pricing tables, plan cards with tier-specific styling, and SEO driven by backend-managed entities. The frontend is built for deployment stability across multiple environments (Dev, Staging, Production).

**Backend (NestJS)**
- **Framework**: NestJS.
- **Database**: PostgreSQL with TypeORM.
- **Queue**: BullMQ with Redis for asynchronous jobs.
- **Authentication**: JWT with Passport.
- **File Storage**: Primary storage on Cloudflare R2 using `@aws-sdk/client-s3`, with a read-fallback to Replit Object Storage for legacy files. Supports direct file serving.
- **Logging**: Custom `PaytradeLogger` for local files and Cloudflare R2 in production.
- **PDF Generation**: Utilizes Puppeteer.
- **Community Bot**: Cron-scheduled OpenAI GPT-4o bot for Q&A content generation.
- **Monitoring**: `/health` endpoint for database checks, `production-server.js` for backend/frontend health monitoring with email alerts, and auto-restart mechanisms.
- **Database Backups**: Automated `pg_dump | gzip` backups to Cloudflare R2 every 6 hours in production, with tiered retention policies.
- **Startup Seeders**: `OnApplicationBootstrap` seeders for admin menus, compliance data, and Xero log templates, designed to insert new data without overwriting existing records.
- **Admin User Management**: Comprehensive CRUD for admin users, groups, and permissions, including tools for menu editing, pricing table management, holiday monitoring, company deletion with impact assessment, and user import/export functionality.
- **SEO & How-To Guides Systems**: Backend-managed systems for dynamic landing pages with SEO keywords and categorized how-to guides.
- **AI Support Assistant**: A search-first support flow incorporating OpenAI GPT-4o for answering user queries, with features like rate limiting, relevance gating, and web search enrichment. A reusable `AiHelpWidget` provides contextual AI support.
- **Smart Reconciliation Matching**: QuickBooks-style smart matching system for bank transactions, supporting exact and near matches with configurable tolerance and quick-adjust functionalities, all within atomic transactions.
- **Xero Retention/GST Handling (Producer)**: When PT pushes claims to Xero, retention and liability lines are constructed via `getRetentionLineSpec()` which sets an explicit `taxType` per line (looked up from the Xero account, 5-min cached) and only grosses up `retention_amount` to inc-GST when (a) the invoice's `lineAmountTypes` is Inclusive AND (b) the destination account's tax type is GST-applicable (excludes BASEXCLUDED/NONE/EXEMPT*/INPUTTAXED). For Exclusive invoices the line stays ex-GST. For NoTax invoices no taxType is set. This prevents over-grossing on BAS-Excluded retention accounts. `retention_amount` is stored ex-GST in PT and the share deducted from each bill_code line uses the ex-GST value (no `* 1.1`). Base bill/invoice line `unitAmount`, `totalLineAmount`, and retention share proration all key off the resolved `lineAmountTypes` (`isInclusiveLine`) rather than `claimDetails.is_gst_optional`, so Exclusive updates send ex-GST `unit_price` (preventing Xero from double-applying GST when the original invoice was Exclusive).
- **Xero Token Refresh Lock**: Redis-based per-company mutex (`xero-token-lock:{company_id}`) in `XeroService.refreshTokenSet()` prevents concurrent OAuth2 token refreshes from invalidating each other. Uses `SET NX EX` for acquire, Lua compare-and-delete for safe release, with 15s TTL and 10s wait. Waiters re-read the DB for freshly refreshed tokens.
- **Xero Integrations (Auto-Creation & Sync)**:
    - **Bank Account Auto-Create**: Two-way synchronization between PayTrade and Xero for bank accounts, with hourly schedulers and manual sync options.
    - **Contact Auto-Create**: Two-way synchronization for contacts, supporting individual and batch creation with type determination (Client/Supplier) from Xero data.
    - **Smart Contract Auto-Creation**: Automatically creates contracts from Xero claims (invoices/bills) based on predefined logic and defaults when no existing contract matches. Validation consolidates all missing fields (Address, Email, bank details, PTA/RTA accounts) into a single error message.
    - **Project & Contract Auto-Create**: Two-way synchronization for projects and contracts, mapping them to Xero tracking categories, with individual and batch creation options.
    - **Manual Contact Financial Sync**: On-demand synchronization of financial details for mapped contacts.
    - **Manual Contact Information Sync**: On-demand synchronization of address, phone, and email from Xero to PayTrade for all mapped contacts, with a dedicated "SYNC CONTACT INFO" button alongside "SYNC FINANCIAL DETAILS".
    - **Webhook Contact Detail Sync**: Real-time sync of address (PO Box/Street), phone (Mobile/Default), and email from Xero when contacts are updated, in addition to name and email.
    - **Sync Log Summary Dashboard Widget**: Displays a summary of recent Xero sync activity on the user dashboard, with colour-coded status breakdown (Synced/Warnings/Failed) and the 10 most recent sync log entries.
    - **Webhook Fallback Scheduler**: Cron-scheduled (every 15 min) fallback that polls Xero API for recently modified invoices and contacts, compares against tracked records in `xero_invoices_bills` and `xero_contact_details`, and processes any gaps missed by webhooks. Uses `sync_run_type: 'fallback'` to distinguish from webhook-triggered syncs.
- **Demo/Sandbox Mode**: Per-company demo mode with isolated Stripe test keys for payments, allowing companies and subscription plans to operate in a sandbox environment.
- **UI Status Lookup (NULL vs empty string)**: `ui_status_and_action_buttons` rows store `claim_type`/`payment_type`/`current_status` as SQL `NULL` for "not applicable" states (e.g. a Xero-imported claim that has no payments yet has `payment_type=NULL`). All four `whereConditions` builders in `back-end/src/api/users/banking/ui-status.service.ts` (lines ~205, ~459, ~740, ~1102) coerce empty-string/null inputs to TypeORM's `IsNull()` so the emitted SQL is `IS NULL` rather than `= ''`. Without this coercion, lookups for Xero-imported `Confirmed` claims with no payments missed the matching seed row and persisted `claim_overview_buttons={}`, causing the claim drawer footer to render only Close (no Edit, no Add Payment).

## External Dependencies
- **PostgreSQL**: Primary application database.
- **Redis**: Shared across all environments (dev/staging/production). Used for BullMQ job queuing and Xero webhook event queue. The webhook queue is namespaced per environment (`xero_webhook_queue:{environment}`) — each backend consumes only its own queue. Auto-detection: `REPL_ID` without `REPLIT_DEPLOYMENT` → `development`, `REPL_ID` with `REPLIT_DEPLOYMENT` → `staging`, neither → `production`. Override with `APP_ENVIRONMENT` env var. The Cloudflare webhook relay worker fans out to all three queues (`xero_webhook_queue:production`, `xero_webhook_queue:staging`, `xero_webhook_queue:development`).
- **Cloudflare R2**: Cloud storage for application files, logs, and database backups.
- **OpenAI API**: For AI content generation and support assistant.
- **Puppeteer**: For PDF document generation.
- **Stripe**: For payment processing.
- **Brevo (formerly Sendinblue)**: For email services.
- **Google Tag Manager, Google Analytics, Cookiebot**: For analytics and cookie consent management.