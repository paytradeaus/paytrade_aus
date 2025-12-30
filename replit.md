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

## Notes
- The application requires various third-party API keys (Stripe, email services, etc.) for full functionality
- Frontend is configured to proxy to the backend GraphQL API
