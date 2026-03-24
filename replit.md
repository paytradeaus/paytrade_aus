# PayTrade Application

## Overview
PayTrade is a full-stack application designed to streamline payment, invoicing, contract management, and trust accounting specifically for the construction industry. It aims to provide a comprehensive solution for managing financial workflows and ensuring compliance within this sector. The project leverages modern web technologies to deliver a robust and scalable platform.

## User Preferences
I prefer clear, concise communication. When making changes, prioritize iterative development and explain the high-level approach before diving into specifics. Please ask for confirmation before implementing significant architectural changes or altering core business logic.

## System Architecture
The application consists of a Next.js frontend and a NestJS backend communicating via a GraphQL API.

**Frontend (Next.js)**
- **Framework**: Next.js 14.2.11 with React 18 for server-side rendering and client-side interactivity.
- **State Management**: Redux Toolkit for predictable state management.
- **API Client**: Apollo Client handles GraphQL queries and mutations.
- **Styling**: SCSS Modules and standard CSS are used for styling components.
- **UI/UX**: Dynamic pricing tables are driven by backend `plan_items` data from `subscription_plan_details`, `subscription_pricing_plan`, `subscription_items`, and `subscription_plan_items` tables. The `PricingGrid` component merges API data with hardcoded fallbacks in `data.ts`. Static assets are served with cache-busting versioning.
- **SEO**: Dynamic landing pages are driven by backend-managed `SeoKeyword` entities, supporting full SEO metadata and sitemap generation.

**Backend (NestJS)**
- **Framework**: NestJS provides a modular and scalable architecture for the API.
- **Database**: PostgreSQL with TypeORM is used for relational data persistence.
- **Queue**: BullMQ with Redis handles asynchronous job processing.
- **Authentication**: JWT with Passport secures API endpoints.
- **File Storage**: Replit Object Storage is the primary storage for all application files, including user uploads, generated PDFs, and application logs. A dedicated `ObjectStorageService` abstracts file operations.
- **File Serving**: Database stores paths as `{folder}/{filename}`. Rewrites in `next.config.js` and a `DirectFileServeController` on the backend serve files from Object Storage, validating against an allowlist of folders (e.g., `company_logo`, `notices`).
- **Logging**: A custom `PaytradeLogger` writes logs to local files and persistently to Replit Object Storage (`application-logs/`) in production, with daily cleanup.
- **PDF Generation**: Puppeteer generates PDFs, which are immediately uploaded to Object Storage (e.g., `notices-generated/`).
- **Community Bot**: A cron-scheduled module uses OpenAI GPT-4o to generate Q&A content for the community, creating bot users with realistic personas.
- **Deployment Stability**: Production deployments use `no-store, no-cache` headers for HTML and RSC responses to mitigate stale cache issues with Next.js Server Actions. A `KeepAliveModule` and a backend auto-restart script enhance stability.
- **Monitoring**: A `/health` endpoint is available for monitoring, and `production-server.js` monitors backend health, sending email alerts on failures.

## External Dependencies
- **PostgreSQL**: Primary database for application data.
- **Redis**: Used by BullMQ for job queuing.
- **Replit Object Storage**: Cloud storage for all application files, logs, and generated content.
- **OpenAI API**: Used by the Community Bot for content generation and bot persona creation.
- **Puppeteer**: Used for generating PDF documents.
- **Stripe**: For payment processing (API keys mentioned).
- **Brevo (formerly Sendinblue)**: For email services, including crash alerts.
- **Google Tag Manager, Google Analytics, Cookiebot**: Integrated for analytics and cookie consent.

## SEO Keywords System
- 12 SEO keywords seeded for project trust accounts, BIF Act, QBCC compliance, retention trust accounts, security of payment, and related construction industry terms
- Seed script: `scripts/seed-seo-keywords.sql` (idempotent via `ON CONFLICT (slug) DO NOTHING`)
- Admin page at `/admin/seo-keywords` with Export JSON / Import JSON buttons
- Export downloads all keywords as a structured JSON array with keyword, slug, page_title, meta_description, page_content, tags, and status
- Import supports upsert: matches by slug — updates existing keywords, creates new ones
- Import preserves status field from the JSON file

## How-To Guides System
- 26 how-to guides seeded into the `blog_resource` table with `content_type = 'howToGuide'`
- Categories stored in `master_types` with `master_type = 'How To Guide Category'`: Getting Started, Projects & Contracts, Payments & Claims, Bank & Trust Accounts, Trust Accounting, Compliance & Notices, Integrations, Community, Admin Panel, User Flows
- Guide screenshots stored in `front-end/public/guide-screenshots/` (25 PNG files)
- Each guide has a `bannerImage` linked to a `file_attachments` row pointing to its screenshot (one unique file_attachment per guide due to UNIQUE constraint on `bannerImage`)
- 4 Admin Panel category guides are set to `Unpublished` (hidden from public `/how-to-guides/` but manageable in admin)
- 22 user-facing guides remain `Published`
- Guides are publicly viewable at `/how-to-guides/[category]/[slug]/[id]`
- Admin-managed at `/admin/how-to-guides` with Export JSON / Import JSON buttons for backup and restore
- Export downloads all guides as a structured JSON file with category IDs + labels, content, tags, status, and banner paths
- Import reads a JSON file, validates categories (by ID with label fallback), and creates guides via the existing `adminAddBlogResource` mutation
- Seeder script: `scripts/capture-screenshots-and-seed-guides.js`
- Comprehensive system documentation: `PayTrade-System-Guide.md`