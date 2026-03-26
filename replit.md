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
- **UI/UX**: Dynamic pricing tables integrate backend `plan_items` and `pricing_table_feature` data. SEO is driven by backend-managed `SeoKeyword` entities.
- **Deployment Stability**: Frontend uses `npx next start` for production, with auto-restart loops, host header proxying, and automatic retry mechanisms for transient errors. Key routes are pre-warmed after restarts.

**Backend (NestJS)**
- **Framework**: NestJS.
- **Database**: PostgreSQL with TypeORM.
- **Queue**: BullMQ with Redis for asynchronous jobs.
- **Authentication**: JWT with Passport.
- **File Storage**: Replit Object Storage for all application files, managed by `ObjectStorageService`. Files are served via a `DirectFileServeController`.
- **Logging**: Custom `PaytradeLogger` writes to local files and Replit Object Storage.
- **PDF Generation**: Puppeteer generates PDFs, uploaded to Object Storage.
- **Community Bot**: A cron-scheduled module uses OpenAI GPT-4o to generate Q&A content.
- **Monitoring**: A `/health` endpoint checks database connectivity. `production-server.js` monitors both backend and frontend health, sending email alerts on failures. Auto-restart mechanisms (EIO Auto-Restart) are in place for critical errors.
- **Admin User Management**: Comprehensive CRUD for admin users, groups, and permissions, including orphan protection for the last active admin. Features include an Admin Menu Editor, Pricing Table Editor, Holiday table monitoring, and a Company Delete function with dependency impact assessment.
- **SEO Keywords System**: Backend-managed keywords drive dynamic landing pages, with interlinking and admin CRUD functionality including import/export.
- **How-To Guides System**: Guides are stored in `blog_resource` with categorized content, banner images, and admin management including import/export.
- **AI Support Assistant**: A search-first support flow at `/support`. Users search FAQs/guides, then can "Ask PayTrade AI" (OpenAI GPT-4o). Features include rate limiting, a relevance gate, web search enrichment for legal questions, and abuse controls. AI answers are auto-posted to the community.
- **Smart Reconciliation Matching**: QuickBooks-style smart matching system for bank transactions. Backend: `fetchBatchSuggestedMatches` (query), `batchMatchExactTransactions` (mutation), `quickAdjustAndMatch` (mutation) in `transactions.service.ts`/`resolver.ts`. Frontend: Smart Match toggle in TransactionsList (localStorage `pt_smart_match`), inline match quality indicators (exact=green, near=amber), expandable rows with payment details, one-click match/adjust-and-match, and "Match All Exact" batch button. DynamicTable supports `renderExpandedRow` prop. Quick-adjust auto-creates over/under payments to bridge discrepancies before matching. **Atomicity**: `addPayment` and `matchTxnsToPayments` accept an optional `externalManager?: EntityManager` parameter; when provided, they participate in the caller's transaction instead of creating their own. `quickAdjustAndMatch` wraps both calls in a single outer transaction for true all-or-nothing rollback. Side effects (emails, notices, compliance) are deferred when running inside an external transaction.

## External Dependencies
- **PostgreSQL**: Primary application database.
- **Redis**: Used for BullMQ job queuing.
- **Replit Object Storage**: Cloud storage for application files and logs.
- **OpenAI API**: Used for AI content generation and support.
- **Puppeteer**: For PDF document generation.
- **Stripe**: For payment processing.
- **Brevo (formerly Sendinblue)**: For email services.
- **Google Tag Manager, Google Analytics, Cookiebot**: For analytics and cookie consent.