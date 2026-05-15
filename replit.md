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
- **Demo/Sandbox Mode**: Per-company demo mode with isolated Stripe test keys for payments, allowing companies and subscription plans to operate in a sandbox environment.
- **Xero Integration**: Two-way sync of contacts, bank accounts, projects/contracts, invoices/bills, payments, and retention manual journals, with webhook + scheduled fallback delivery and a self-service manual re-sync tool. See architecture notes index below for deep-dives on each subsystem.

## External Dependencies
- **PostgreSQL**: Primary application database.
- **Redis**: Shared across all environments (dev/staging/production), used for BullMQ and the Xero webhook queue. See [`docs/architecture/redis-environments.md`](docs/architecture/redis-environments.md) for environment namespacing details.
- **Cloudflare R2**: Cloud storage for application files, logs, and database backups.
- **OpenAI API**: For AI content generation and support assistant.
- **Puppeteer**: For PDF document generation.
- **Stripe**: For payment processing.
- **Brevo (formerly Sendinblue)**: For email services.
- **Google Tag Manager, Google Analytics, Cookiebot**: For analytics and cookie consent management.

## Architecture Notes Index
Per-feature deep-dives live under `docs/architecture/`. Pull only the ones relevant to your current task:

- [Email sending patterns](docs/architecture/email-patterns.md) — DB-template-driven vs inline `header-footer-email` wrapper; when to add a seeder.
- [Redis environments & webhook queue namespacing](docs/architecture/redis-environments.md)
- [Xero token refresh lock](docs/architecture/xero-token-refresh-lock.md) — Redis mutex protecting OAuth2 refreshes.
- [Xero integrations (auto-creation & sync)](docs/architecture/xero-integrations-auto-create-sync.md) — bank accounts, contacts, contracts/projects, manual sync, dashboard widget, fallback scheduler.
- [Xero contact GST sync (Phase 2)](docs/architecture/xero-contact-gst-sync-phase-2.md) — per-contact GST defaults, org-default cache, `resolveContactGstStatus` helper, alignment endpoints.
- [Xero retention recording mode (Phase 1)](docs/architecture/xero-retention-recording-mode-phase-1.md) — `ex_gst` / `inc_gst`, retention tax type override, per-line GST recompute.
- [Xero retention/GST handling (producer)](docs/architecture/xero-retention-gst-producer.md) — `getRetentionLineSpec()` and ex-GST vs inclusive line construction.
- [Xero retention auto gross-up journals (Phase 3)](docs/architecture/xero-retention-gross-up-phase-3.md) — balanced manual journals, tax-type resolution, anti-echo.
- [Xero invoice/bill on claims + audit pack](docs/architecture/xero-invoice-bill-claims-audit-pack.md) — cached PDFs, deep links, audit-pack ZIPs.
- [Xero payment/retention sync gate split](docs/architecture/xero-payment-retention-gate-split.md) — Task #50/#52: per-leg push, inbound matcher pipeline, symmetric un-tick → delete.
- [Manual Xero re-sync by ID](docs/architecture/manual-xero-resync.md) — Task #65: self-service single-record recovery tool.
- [UI status lookup (NULL vs empty string)](docs/architecture/ui-status-lookup.md) — `ui_status_and_action_buttons` lookup coercion.
- [AI Tool Registry & Audit Foundation](docs/architecture/ai-tool-registry.md) — Task #159: `ai_tool_registry`, `ai_tool_calls`, `ai_prompt_audit`, `activity_log_new.actor_mode` / `ai_run_id`, the `AiTool` wrapper-around-a-domain-service rule.
