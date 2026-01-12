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
- `REDIS_HOST`, `REDIS_PORT` - Redis connection for BullMQ
- `BULL_USER`, `BULL_PASSWORD` - Bull board authentication

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
- **Fixed readFileSync to use ObjectStorageService** - Replaced all local filesystem reads in resolvers/services with ObjectStorageService.downloadFile() for profile photos, company logos, contracts, variations, and file attachments
  - Updated: signup.resolver.ts, user-access.resolver.ts, file-upload.resolver.ts, variations.resolver.ts, contract-details.resolver.ts, read-file-attachments.service.ts

## File Serving Architecture
- Database stores file paths as `{folder}/{filename}` (e.g., `company_logo/image.jpg`)
- Frontend uses these paths directly as image sources with leading slash
- next.config.js rewrites proxy all file folder requests to the backend
- DirectFileServeController validates folder against allowlist and serves from Object Storage
- File folders: profile_photo, admin_profile_photo, company_logo, communication, trust_training_records, blog_banner, resources, notice-templates, notices, recieved-notices, notices_supporting_docs, contracts, variations, bank_statements, retention_trust_certificates, transaction_csv_file_attachments, optional_attachments, compulsory_attachments, optional_supporting_statement_attachments, audit_reports, generated_aba_files, Admin_holiday, misc

## Notes
- The application requires various third-party API keys (Stripe, email services, etc.) for full functionality
- Frontend is configured to proxy to the backend GraphQL API
