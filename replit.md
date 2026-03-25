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
- **UI/UX**: Dynamic pricing tables are driven by both the `pricing_table_feature` table (feature rows) and backend `plan_items` data (numeric limits/unlimited overrides). The `PricingGrid` component fetches features from `getAllPricingTableFeatures` public GraphQL query, with hardcoded fallbacks in `data.ts`. Plan-specific item overrides (unlimited, numeric limits) are merged on top. Static assets are served with cache-busting versioning.
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
- **Deployment Stability**: Production deployments use `no-store, no-cache` headers for HTML and RSC responses to mitigate stale cache issues with Next.js Server Actions. Both backend and frontend have auto-restart loops in `start-production.sh`. The proxy uses `changeOrigin: true` for frontend requests to prevent Next.js host header validation issues (400 errors on static assets).
- **Monitoring**: `/health` endpoint returns real status of both backend and frontend (200 when both healthy, 503 with details when degraded). `production-server.js` monitors both backend (port 3001) and frontend (port 5001) health every 30 seconds, sending Brevo email alerts on failures. `KeepAliveService` pings `/health` every 5 minutes and logs degraded status details.

## Admin User Management
- **Admin Menu Seeder**: `AdminMenuSeederModule` (`back-end/src/libs/@seeders/`) runs on app bootstrap via `OnApplicationBootstrap`. Seeds 22 master menus with fixed UUIDs, updates existing menus if any field changes (including sub_menus), cleans up old duplicate menus, and grants full permissions to all active admin groups. Uses raw SQL for `sub_menus` (json[]) updates to avoid TypeORM serialization issues. Idempotent — safe to run on every deploy.
- **Admin Users menu** has sub-menus for "Admin users" (`/admin/admin-users`) and "Admin groups" (`/admin/groups`) where permissions are managed.
- **Password management**: Admin passwords can be updated via the edit form (optional "Change Password" field with full validation). Backend hashes with `bcryptjs`. Admins can only change their own password; for other admins use "Reset Password" which generates a random password and emails it.
- **Orphan protection**: Backend `ensureNotLastActiveAdmin()` in `PtAdminService` prevents deleting or deactivating the last active admin user. Enforced in `PortalAdminUpdate` for status changes to Inactive/Deleted.
- **SQL seed**: `scripts/seed-admin-menus.sql` is the idempotent SQL equivalent (ON CONFLICT DO NOTHING) with all 21 menus.
- **Admin Guides page**: `/admin/admin-guides` displays admin-only how-to guides (filtered to "Admin Panel" category). Uses existing `adminListAllBlogResources` query. Module at `front-end/src/modules/admin/AdminGuides/`.
- **Admin Menu Editor**: `/admin/admin-menus` provides full CRUD management of sidebar menu items. Admins can add, edit, reorder, delete menus and manage sub-menus inline. Backend: GraphQL mutations `adminAddMenu`, `adminUpdateMenu`, `adminDeleteMenu`, `adminBulkUpdateMenus` in `PtGroupsResolver`. Uses raw SQL for `sub_menus` (json[] column). Module at `front-end/src/modules/admin/AdminMenuEditor/`.
- **Pricing Table Editor**: `/admin/subscriptions/pricing-table` provides full CRUD management of the public pricing comparison table features. Supports inline editing, add/delete rows, drag reorder, preset value helpers ("true"=checkmark, "false"=cross, text=displayed as-is), and a preview mode. Backend entity: `PricingTableFeature` with GraphQL CRUD + bulk update. Seed SQL: `scripts/seed-pricing-table-features.sql` (25 features).
- **Holiday table monitoring**: Dashboard banner warns when holiday coverage < 90 days (yellow/orange/red severity). Monthly cron (1st of month, 8AM UTC) sends email alert. Backend `getHolidayTableStatus` query and `sendHolidayExpiryAlert` service method.
- **Admin recurring tasks guide**: Static HTML guide at `/admin-guide-recurring-tasks.html` covering all manual and automated admin processes.

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
- 121 SEO keywords seeded covering QBCC project trust accounts, BIF Act compliance, role-based guides (contractors, subcontractors, principals), process/how-to content, risk/penalties, and commercial/conversion pages
- Seed scripts: `scripts/seed-seo-keywords.sql` (original 12) and `scripts/seed-seo-keywords-full.sql` (111 additional keywords, idempotent via `ON CONFLICT (slug) DO NOTHING`)
- **SEO Interlinking**: `RelatedTopics` component (`front-end/src/modules/general/SeoLandingPage/RelatedTopics.tsx`) auto-links keyword pages to each other based on tag overlap and keyword word matching, with a "View All" toggle for browsing all topics
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

## AI Support Assistant
- Search-first support flow at `/support` — users must search before the AI option appears
- **Step 1**: Search bar queries FAQs, how-to guides, community discussions, and community answers via `searchSupport` GraphQL query (public, no auth required)
- **Step 2**: After search results appear, "Didn't find what you needed?" section shows with "Ask PayTrade AI" button (auth required)
- **Step 3**: AI answer from OpenAI GPT-4o using PayTrade System Guide as context (50,000 chars); answer auto-posted to community. Response format instructions ensure detailed step-by-step answers with specific page URLs, button names, and field references.
- **Step 4**: "Still need help?" links to `/get-support` contact form (always visible)
- **Rate Limiting**: `ai_support_usage` table tracks usage. Free tier: 2 questions/hour (personal). Paid tier: 20 questions/day (shared company pool). User gets highest tier across all company memberships
- **Relevance Gate**: Low-cost GPT-4o-mini pre-check rejects off-topic questions before they consume quota or pollute community content. Returns `OFF_TOPIC` status with friendly message. Also flags questions needing web search for legal/regulatory data.
- **Web Search Enrichment**: For complex BIF Act / QBCC legal questions, the relevance gate flags `needs_web_search`. The main GPT-4o call then uses OpenAI's `web_search_preview` tool to fetch current legal data, regulations, and court decisions — compensating for training data cutoffs.
- **Abuse Controls**: HTML stripping, 500-char max, SHA-256 duplicate detection (5-min window), prompt injection guard in system prompt
- **Tier Detection**: `company_user_roles` (user_id, status=Active) → `subscription_details` (company_id) → `subscription_plan_details` (plan_type: Free|Paid)
- **Backend**: `AiSupportModule` at `back-end/src/api/common/ai-support/` with service, resolver, DTOs, responses
- **Entity**: `AiSupportUsage` at `back-end/src/entities/ai-support-usage.entity.ts` (user_id, company_id, question, question_hash, asked_at)
- **Frontend**: `AiSupportPage` at `front-end/src/modules/general/AiSupport/` with functions file
- **Route**: `/support` page at `front-end/src/app/support/page.tsx` (screen="AI_SUPPORT")
- **Navigation**: Added to GuestNavbar Support dropdown, GuestFooter, and HomeMobileSidebar; "Ask PayTrade AI" button on community page
- **OpenAI Pattern**: Uses `this.openai.responses.create({ model: 'gpt-4o', instructions: ..., input: ... })`