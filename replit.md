# PayTrade Application

## Overview
PayTrade is a full-stack application for managing payments, invoices, contracts, and trust accounting in the construction industry. It features a Next.js frontend and a NestJS backend with GraphQL API.

## Architecture

### Frontend (Next.js)
- **Port**: 5000
- **Framework**: Next.js 14.2.11 with React 18
- **State Management**: Redux Toolkit
- **API Client**: Apollo Client (GraphQL)
- **Styling**: SCSS Modules, CSS

### Backend (NestJS)
- **Port**: 3001
- **Framework**: NestJS with GraphQL
- **Database**: PostgreSQL with TypeORM
- **Queue**: BullMQ with Redis
- **Authentication**: JWT with Passport
- **File Storage**: Replit Object Storage (bucket: `paytrade_uploads`)

## Project Structure
```
├── front-end/          # Next.js frontend application
│   ├── src/
│   │   ├── app/        # Next.js App Router pages
│   │   ├── components/ # Reusable components
│   │   ├── container/  # Page containers
│   │   ├── modules/    # Feature modules
│   │   └── network/    # API client (Apollo)
│   └── package.json
├── back-end/           # NestJS backend application
│   ├── src/
│   │   ├── api/        # API modules (users, admin, etc.)
│   │   ├── entities/   # TypeORM entities
│   │   └── libs/       # Shared libraries
│   └── package.json
└── replit.md           # This file
```

## Environment Variables

### Backend
- `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_NAME` - PostgreSQL connection
- `PORT` - Backend server port (3001)
- `REDIS_HOST`, `REDIS_PORT` - Redis connection for BullMQ (development only)
- `REDIS_URL` - Upstash Redis URL (production only, used when REPLIT_DEPLOYMENT=1)
- `BULL_USER`, `BULL_PASSWORD` - Bull board authentication

## Redis Configuration
- **Development**: Uses local redis-server (127.0.0.1:6379) - isolated queue for dev testing
- **Production**: Uses Upstash Redis (REDIS_URL) - shared production queue
- **Detection**: Uses `REPLIT_DEPLOYMENT === '1'` (automatically set in published deployments) instead of NODE_ENV
- This separation prevents development from processing production Xero webhook jobs

### Frontend
- `NEXT_PUBLIC_GRAPHQL_URI` - GraphQL endpoint URL
- `NEXT_PUBLIC_DEPLOYED_URL` - Base URL for the deployed application

## Workflows
- **Frontend**: `cd front-end && npm run dev` - Runs Next.js on port 5000
- **Backend**: `redis-server --daemonize yes; cd back-end && npm run start:dev` - Runs NestJS on port 3001

## Recent Changes
- Configured for Replit environment
- Fixed route conflicts in Next.js App Router
- Replaced `canvas` with `@napi-rs/canvas` for better compatibility
- Set up PostgreSQL database connection
- Configured Redis for BullMQ job queues
- Migrated file uploads from local filesystem to Replit Object Storage
- Created ObjectStorageService wrapper in `back-end/src/libs/@object-storage/`
- Added FileServeController to serve files from Object Storage at `/uploads/:folder/:filename`
- Fixed stream handling in file-upload.resolver.ts to consume stream once
- Added DirectFileServeController with catch-all route for serving files directly (e.g., `/company_logo/:filename`)
- Added @Public() decorator to file serving controllers to bypass authentication
- Fixed Object Storage buffer conversion for proper file downloads
- Added CORS headers (Cross-Origin-Resource-Policy: cross-origin) for Next.js Image Optimization
- Added rewrites in next.config.js for all file folder paths to proxy to backend
- Created fileUrl.ts utility for normalizing file paths in frontend
- **Fixed readFileSync to use ObjectStorageService** - Comprehensive migration of all local filesystem reads to ObjectStorageService.downloadFile() for production deployment
  - Phase 1: signup.resolver.ts, user-access.resolver.ts, file-upload.resolver.ts, variations.resolver.ts, contract-details.resolver.ts, read-file-attachments.service.ts
  - Phase 2: notices.service.ts (5+ calls), journals.resolver.ts (2 calls), journals.service.ts (1 call), transactions.service.ts (1 call), payment-claims.service.ts (1 call), community.service.ts (3 calls), pt-admin.resolver.ts (1 call), pt-admin-access.resolver.ts (1 call), pt-contents.service.ts (1 call), communication-management.service.ts (1 call)
  - Created reusable addFileBase64FromStorage() helper in notices.service.ts
  - Added normalizeObjectPath() in ObjectStorageService to handle various path formats (leading slashes, "uploads/" prefix)
  - Pattern: `const fileBuffer = await objectStorageService.downloadFile(filePath); if (fileBuffer) { base64 = fileBuffer.toString('base64'); }`
  - **File deletion migration**: Replaced all `fs.unlink()` calls in file-upload.resolver.ts with `objectStorageService.deleteFile()` for production compatibility
  - **File path normalization**: Added `formatPublicPath()` helper to ensure all returned file paths start with `/` for browser URL compatibility. Replaced all `UPLOAD_BASE_URL` concatenations with direct slash prefix normalization across: file-upload.resolver.ts, signup.resolver.ts, variations.resolver.ts, variations.service.ts, read-file-attachments.service.ts, payments.service.ts, journals.service.ts, pt-contents.service.ts, community.service.ts

## File Serving Architecture
- Database stores file paths as `{folder}/{filename}` (e.g., `company_logo/image.jpg`)
- Frontend uses these paths directly as image sources with leading slash
- next.config.js rewrites proxy all file folder requests to the backend
- DirectFileServeController validates folder against allowlist and serves from Object Storage
- File folders: profile_photo, admin_profile_photo, company_logo, communication, trust_training_records, blog_banner, resources, notice-templates, notices, recieved-notices, notices_supporting_docs, contracts, variations, bank_statements, retention_trust_certificates, transaction_csv_file_attachments, optional_attachments, compulsory_attachments, optional_supporting_statement_attachments, audit_reports, generated_aba_files, Admin_holiday, misc, notices-generated, original-notices-generated

## Object Storage Migration Notes
- ObjectStorageModule is @Global(), making ObjectStorageService injectable in any module without explicit import
- ObjectStorageService.downloadFile() normalizes paths automatically (strips leading "/", strips "uploads/" prefix)
- ObjectStorageService.uploadFileDirect() allows direct upload with explicit object path
- Remaining non-critical readFileSync calls (not user files): email.service.ts (email templates), write-to-image.mjs (JSON config)
- **Excel Export Migration**: Migrated generateSignedUrl in export-data.service.ts to upload Excel files to Object Storage (`excel_exports/` folder) instead of local filesystem. Controller downloads from Object Storage and optionally deletes after download.

## Production Logging
- **PaytradeLogger** (`back-end/src/libs/@loggers/logger.service.ts`) handles application logging
- **Development**: Writes logs to local `logs/YYYY-MM-DD.log` files + console output
- **Production** (NODE_ENV=production): 
  - Writes to local files (ephemeral)
  - Also uploads to Object Storage at `application-logs/YYYY-MM-DD.log` (persistent)
  - Uses buffered writes (5-second flush interval) for efficiency
- **Log retention**: Automatic cleanup of logs older than 30 days (configurable via `LOG_DELETION_DAYS` env var)
- **Cleanup runs**: Daily at midnight via cron job, deletes old logs from both local files and Object Storage
- **Viewing production logs**: Use Replit Publishing > Logs tab for real-time console output, or download from Object Storage for historical logs
- All PDF-related secrets need production values: NEXT_PUBLIC_SOCKET_URL, NEXT_PUBLIC_WEB_SOCKET_BASED_PDF_FILE_DOWNLOAD_TO_GET_URL
- **Notice PDF Generation**: PDFs generated by Puppeteer are now uploaded to Object Storage immediately after creation:
  - `notices-generated/` folder for annex PDFs (QBCC notices)
  - `original-notices-generated/` folder for original notice PDFs
  - Local temporary files are deleted after upload
- **Email Attachments**: EmailService now reads attachments from Object Storage for all known file folders

## Frontend API Endpoint Configuration
- **All GraphQL/API calls use relative URLs** for production compatibility:
  - Apollo Client: `/graphql` (browser) or `NEXT_PUBLIC_GRAPHQL_URI` (server-side only)
  - File upload APIs (singleUploadApi, multipleFileUploadApi): `/graphql`
  - Excel download: `/files/excel`
  - Audit report download: `/files/auditReport`
- Production proxy (production-server.js) routes requests between frontend (port 5001) and backend (port 3001)
- next.config.js rewrites handle dev environment proxying

## Notes
- The application requires various third-party API keys (Stripe, email services, etc.) for full functionality
- Frontend is configured to proxy to the backend GraphQL API
- Fixed hydration errors by consolidating GoogleTagManager, GoogleAnalytics, and Cookiebot scripts into a unified AnalyticsWrapper client component
- Puppeteer uses system Chromium at `/nix/store/.../chromium` for PDF generation

## Static File Serving (Production)
- **Production proxy** (production-server.js) passes static file requests (`/images/`, `/json/`) to Next.js frontend for proper serving
- **Cache-busting**: All static assets use version query params (e.g., `?v=1`) to force browser cache refresh after updates
- If adding new static files, update version params when changing files to bust user caches
- Static files are stored in `front-end/public/images/` and `front-end/public/json/`

## Deployment Stability (Feb 2026)
- **Root cause of 400 errors**: Next.js Server Actions have unique IDs per build. When users have cached pages from old deployments, their cached pages reference Server Action IDs that no longer exist.
- **Fix**: Production proxy adds `no-store, no-cache` headers to HTML pages and RSC responses to prevent browser caching of pages that could become stale after deployment
- **Keep-alive service**: KeepAliveModule pings `/health` every 5 minutes in production (only when `REPLIT_DEPLOYMENT=1`) for health monitoring
- **Health endpoint**: `/health` returns JSON status for monitoring
