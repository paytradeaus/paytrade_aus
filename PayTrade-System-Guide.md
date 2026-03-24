# PayTrade System Guide

A comprehensive guide to every page, feature, user action, and system flow in the PayTrade application - a trust accounting and payment management platform for the Australian construction industry.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [User Roles & Permissions](#2-user-roles--permissions)
3. [Subscription Plans & Feature Access](#3-subscription-plans--feature-access)
4. [Public Pages](#4-public-pages)
5. [User Registration & Onboarding Flow](#5-user-registration--onboarding-flow)
6. [User Authentication](#6-user-authentication)
7. [User Dashboard](#7-user-dashboard)
8. [Business & Company Management](#8-business--company-management)
9. [Clients & Suppliers](#9-clients--suppliers)
10. [Projects](#10-projects)
11. [Contracts](#11-contracts)
12. [Variations](#12-variations)
13. [Payment Claims (PayApps)](#13-payment-claims-payapps)
14. [Payments & Retention](#14-payments--retention)
15. [Bank & Trust Accounts](#15-bank--trust-accounts)
16. [Trust Accounting](#16-trust-accounting)
17. [Compliance Monitoring](#17-compliance-monitoring)
18. [Notices](#18-notices)
19. [Integrations (Xero)](#19-integrations-xero)
20. [Community](#20-community)
21. [User Settings & Security](#21-user-settings--security)
22. [Admin Panel](#22-admin-panel)
23. [Full System Flow: End-to-End](#23-full-system-flow-end-to-end)

---

## 1. System Overview

PayTrade is a full-stack web application that manages **Project Trust Accounts (PTA)** and **Retention Trust Accounts (RTA)** under Australia's **Building Industry Fairness (Security of Payment) Act (BIF Act)**. It serves head contractors, subcontractors, principals, accountants, bookkeepers, auditors, and legal practitioners.

**Technology Stack:**
- **Frontend:** Next.js 14 (React 18), Redux Toolkit, Apollo Client (GraphQL), SCSS Modules
- **Backend:** NestJS, TypeORM, PostgreSQL, BullMQ (Redis), JWT/Passport authentication
- **Payments:** Stripe
- **Integrations:** Xero (accounting), Adatree (Open Banking)
- **PDF Generation:** Puppeteer
- **AI:** OpenAI GPT-4o (community bot content generation)

---

## 2. User Roles & Permissions

### Platform User Roles

| Role | Description | Context |
|------|-------------|---------|
| **BASIC USER** | Individual user, limited to personal account | Assigned on initial registration |
| **STANDARD USER** | User invited to join another company | Granted by PRIMARY ADMIN of a company |
| **PRIMARY ADMIN** | Owner/creator of a company profile | Automatically assigned when creating a business |
| **ADMIN** | Company administrator with elevated permissions | Granted by PRIMARY ADMIN |

### Admin Portal Roles

| Role | Description |
|------|-------------|
| **PORTAL ADMIN** | Full system administrator with access to all admin features |
| **RESTRICTED PORTAL ADMIN** | Limited admin with read-only access to certain areas |

### Multi-Profile System
A single user account can be associated with multiple companies, each with different roles. Users switch between profiles via the **Select Profile** page (`/user/select-profile`).

---

## 3. Subscription Plans & Feature Access

PayTrade offers four subscription tiers with monthly and yearly billing. Plans are managed via Stripe and enforced on the backend.

### Plan Comparison

| Feature | Basic (Free) | Standard | Advanced | Pro Audit |
|---------|:---:|:---:|:---:|:---:|
| **Price (Yearly)** | Free | ~$100/yr | ~$500/yr | ~$1,000/yr |
| **Users** | 1 | 5 | Unlimited | Unlimited |
| **Projects** | 1 | 1 | 10 | Unlimited |
| **Trust Accounts** | 2 | 2 | 10 | Unlimited |
| **Trust 7-Year History** | 2 | 2 | 10 | Unlimited |
| **Principals** | Yes | Yes | Yes | Yes |
| **Head Contractors** | Yes | Yes | Yes | Yes |
| **Sub Contracts** | Yes | Yes | Yes | Yes |
| **Notices** | Manual | Automated | Automated | Automated |
| **ABA Generation** | No | Yes | Yes | Yes |
| **Bank Feeds** | No | Yes | Yes | Yes |
| **Delegate Authority** | No | No | Yes | Yes |
| **Xero Integration** | No | No | Yes | Yes |
| **Onboarding Support** | No | No | 1 hour | 3 hours |
| **Audit Export** | No | No | No | Yes |
| **Trust Account Records** | Yes | Yes | Yes | Yes |
| **Community Access** | Yes | Yes | Yes | Yes |
| **Eligibility Checks** | Yes | Yes | Yes | Yes |
| **Account Opening** | Yes | Yes | Yes | Yes |
| **Progress Claims** | Yes | Yes | Yes | Yes |
| **Payment Schedule** | Yes | Yes | Yes | Yes |
| **Compliance Monitoring** | Yes | Yes | Yes | Yes |
| **Retention Record** | Yes | Yes | Yes | Yes |
| **Notice Management** | Yes | Yes | Yes | Yes |
| **Contract Management** | Yes | Yes | Yes | Yes |
| **Accountant Access** | Yes | Yes | Yes | Yes |

### Subscription Enforcement
- When a user attempts to exceed plan limits (e.g., creating a second project on a Basic plan), the backend returns a warning: *"Please upgrade your subscription plan."*
- Subscriptions can have statuses: **Subscribed**, **Under Trial**, **Past Due**, **Unsubscribed**.
- Trial periods are configurable per plan.
- Users can upgrade from `/user/manage-subscriptions/upgrade-plan`.

---

## 4. Public Pages

These pages are accessible without authentication.

### Main Pages

| Page | URL | Description |
|------|-----|-------------|
| **Home / Landing Page** | `/` | Platform overview, value proposition, industry sections |
| **Pricing** | `/pricing` | Plan comparison with monthly/yearly toggle |
| **Features** | `/features` | Detailed feature descriptions |
| **FAQ** | `/faq` | Frequently asked questions (admin-managed) |
| **Get Support** | `/get-support` | Contact form and support information |

### Industry-Specific Landing Pages

| Page | URL | Target Audience |
|------|-----|-----------------|
| **Principals** | `/principals` | Project principals/clients |
| **Head Contractors** | `/headcontractors` | Head contractors |
| **Subcontractors** | `/subcontractors` | Subcontractors |
| **Accountants** | `/accountants` | Accounting professionals |
| **Bookkeepers** | `/bookkeepers` | Bookkeeping professionals |
| **Auditors** | `/auditors` | Audit professionals |
| **Legal Practitioners** | `/legal-practitioners` | Lawyers specializing in construction law |

### Content Pages

| Page | URL | Description |
|------|-----|-------------|
| **Blog** | `/blog` | Published articles and news |
| **Blog Category** | `/blog/[category]` | Blog filtered by category |
| **Blog Post** | `/blog/[category]/[slug]/[id]` | Individual blog article |
| **Articles / Resources** | `/articles` | Educational resource articles |
| **Resource Category** | `/articles/[category]` | Resources filtered by category |
| **Individual Resource** | `/articles/[category]/[slug]/[id]` | Single resource article |
| **How-to Guides** | `/how-to-guides` | Step-by-step platform guides |
| **Guide Category** | `/how-to-guides/[category]` | Guides filtered by category |
| **Individual Guide** | `/how-to-guides/[category]/[slug]/[id]` | Single how-to guide |
| **SEO Topic Pages** | `/topics/[slug]` | Dynamic pages driven by admin SEO keywords |

### Legal Pages

| Page | URL |
|------|-----|
| **Terms and Conditions** | `/terms-and-conditions` |
| **Privacy Policy** | `/privacy-policy` |
| **Cookie Policy** | `/cookie-policy` |

### Community (Publicly Viewable)

| Page | URL | Description |
|------|-----|-------------|
| **Community Home** | `/community` | Overview of discussions and product ideas |
| **Discussions** | `/community/discussions` | List of community discussions |
| **Discussion by Category** | `/community/discussions/[category]` | Filtered discussions |
| **Discussion Topic** | `/community/discussions/[category]/[topic]/[id]` | Single discussion thread |
| **Product Ideas** | `/community/product-ideas` | Feature request submissions |
| **Idea by Category** | `/community/product-ideas/[category]` | Filtered ideas |
| **Idea Detail** | `/community/product-ideas/[category]/[topic]/[id]` | Single product idea |

---

## 5. User Registration & Onboarding Flow

### Step-by-Step Registration Process

#### Step 1: Sign Up
**URL:** `/user/login` (sign-up tab)

**Actions:**
- Enter email address and password
- Password must meet complexity requirements: 8+ characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
- System checks if email already exists via `checkUserExistence` query
- reCAPTCHA verification is performed

#### Step 2: Email Verification
**URL:** `/user/registration/verification`

**Actions:**
- A 6-digit OTP is sent to the registered email
- OTP expires after 20 minutes
- User enters the code to verify their email
- Option to resend OTP if expired

#### Step 3: Personal Details
**URL:** `/user/registration/details`

**Actions:**
- Enter first name, last name, phone number
- Select occupation and position title
- Provide address (integrated with Google Places autocomplete)

#### Step 4: Profile Photo Upload
**URL:** `/user/registration/profile-upload`

**Actions:**
- Upload a profile picture (optional)
- Crop and adjust image
- Skip option available

#### Step 5: Business Profile Setup
**URL:** `/user/registration/business-profile`

**Actions:**
- Enter company name, ABN, entity type
- System searches for existing matching businesses
- If a match is found, user can request to join the existing business
- If no match, a new company profile is created

#### Step 6: Tax Information
**URL:** `/user/registration/tax`

**Actions:**
- Enter tax-related details (TFN, GST registration status)

#### Step 7: Company Verification
**URL:** `/user/registration/company-verification`

**Actions:**
- Upload supporting documents for business verification
- QBCC license number (if applicable)

#### Step 8: Profile Selection
**URL:** `/user/registration/select-profile`

**Actions:**
- If the user has been invited to existing companies, select which profile to activate
- Choose between personal company or joined company

### What Happens on Registration (Backend)
When a user completes registration, the system automatically creates:
1. A **UserDetails** record
2. A **CompanyDetails** record (type: "Personal", system-added)
3. A **SubscriptionDetails** record (Free plan) for that company
4. A **CompanyUserRoles** record assigning the user as **PRIMARY_ADMIN** of their personal company
5. An initial JWT access token is issued

---

## 6. User Authentication

### User Login
**URL:** `/user/login`

**Actions:**
- Enter email and password
- System checks credentials against `user_details` table
- Account lockout after multiple failed attempts (5-minute lock)
- On success: JWT access token and refresh token issued
- User is redirected to dashboard or profile selection (if multi-company)

### Forgot Password
**URL:** `/user/forgot-password`

**Actions:**
- Enter registered email address
- System sends a verification OTP to the email

### Verify Code
**URL:** `/user/verify-code`

**Actions:**
- Enter the OTP received via email
- On success: temporary access token issued for password reset

### Update Password
**URL:** `/user/update-password`

**Actions:**
- Enter new password (must meet complexity requirements)
- Confirm new password
- Confirmation email sent after successful reset

### Profile Selection (Multi-Company)
**URL:** `/user/select-profile`

**Actions:**
- Displayed when a user belongs to multiple companies
- Lists all company profiles with the user's role in each
- Selecting a profile sets the active company context for the session

---

## 7. User Dashboard

**URL:** `/user/dashboard`
**Access:** All authenticated users

The dashboard is the central hub for all business operations after login.

### Dashboard Sections

#### Welcome & Quick Access
- Personalized welcome message with user's name
- Quick action links:
  - Add Client or Supplier
  - Add Project
  - Add Contract
  - Add Trust Account
  - Add Payment Application (Claim)
  - Audit Accounts
  - QBCC Eligibility Checker (external link)
  - Reconciliation

#### To-Do Boxes (Real-time Summaries)
- **Payments To Do:** Count of unmatched/pending payments requiring action
- **Notices To Do:** Mandatory QBCC notices that need to be generated or sent
- **Compliance To Do:** Projects or accounts with compliance issues requiring attention

#### Financial Overview
- **Cash Accounts:** Current balances across general cash accounts
- **Project Trust Accounts (PTA):** Summary of PTA balances
- **Retention Trust Accounts (RTA):** Summary of RTA balances

#### Unmatched Transactions
- Highlights bank transactions that haven't been reconciled with claims or payments

#### Activity Log Access
- Link to full activity log showing all recent system actions

---

## 8. Business & Company Management

### Business Profile
**URL:** `/user/edit-business-profile`
**Access:** PRIMARY ADMIN, ADMIN

**Features:**
- Edit company details: legal name, entity type, ABN, ACN
- Contact information: phone, email, address (Google Places integration)
- QBCC license numbers and registration details
- Trust record tracking: mandatory training records and authorized signatories
- Company logo upload

### Add Business Profile
**URL:** `/user/add-business-profile`
**Access:** All users

**Actions:**
- Create a new business entity
- Search for existing businesses via `/user/matching-business`
- If match found, request to join as a Standard User

### Business Verification
**URL:** `/user/business-verification`

**Actions:**
- Upload verification documents
- Track verification status

### User Access Management
**URL:** `/user/company/user-access`
**Access:** PRIMARY ADMIN, ADMIN

**Actions:**
- View all users in the company
- Add new users: `/user/company/user-access/add`
- Edit user roles/permissions: `/user/company/user-access/edit/[id]`
- Remove user access
- Control granular permissions for specific business functions

### Invitations
**URL:** `/user/company/invitations`
**Access:** PRIMARY ADMIN, ADMIN

**Actions:**
- View pending invitations
- Send new invitations to join the company
- Revoke pending invitations

---

## 9. Clients & Suppliers

**URL:** `/user/clients-suppliers`
**Access:** All users with active subscription

### Client & Supplier Management

| Action | URL | Description |
|--------|-----|-------------|
| **List** | `/user/clients-suppliers` | View all clients and suppliers |
| **Add** | `/user/clients-suppliers/add` | Create a new client or supplier record |
| **View** | `/user/clients-suppliers/view/[id]` | View contact details |
| **Edit** | `/user/clients-suppliers/edit/[id]` | Update contact details |

**Features:**
- Manage contact details for all business relationships
- Link clients/suppliers to contracts and projects
- Track ABN and business registration details
- Import from Xero (Advanced/Pro Audit plans)

---

## 10. Projects

**URL:** `/user/projects`
**Access:** All users (subject to plan limits)

### Project Limits by Plan
- **Basic:** 1 project
- **Standard:** 1 project
- **Advanced:** 10 projects
- **Pro Audit:** Unlimited projects

### Project Management

| Action | URL | Description |
|--------|-----|-------------|
| **List** | `/user/projects` | View all projects (active/archived) |
| **Add** | `/user/projects/add` | Create a new project |
| **Edit** | `/user/projects/edit/[id]` | Update project details |
| **Overview** | `/user/projects/overview/[...data]` | Project dashboard with contracts, accounts, compliance |

### Project Creation Fields
- Project name and description
- Project value and type
- Start and completion dates
- Principal details
- Location (Google Places integration)
- **Eligibility Checker:** Determines if the project requires a PTA based on contract value and type under the BIF Act

### Project Overview Dashboard
The project overview page provides a centralized view of:
- Associated contracts
- Linked bank/trust accounts
- Compliance status
- Payment claims
- Notices generated
- Financial summary

---

## 11. Contracts

**URL:** `/user/contracts`
**Access:** All users with active subscription

### Contract Management

| Action | URL | Description |
|--------|-----|-------------|
| **List** | `/user/contracts` | View all contracts |
| **Add** | `/user/contracts/add` | Create a new contract |
| **Edit** | `/user/contracts/edit/[id]` | Update contract details |
| **Overview** | `/user/contracts/overview/[...data]` | Contract details and linked items |

### Contract Features
- Link contracts to specific projects and subcontractors/suppliers
- Track contract sums, variation amounts, and adjusted totals
- Define payment schedules (claim frequencies, due dates)
- Retention percentage and release conditions
- Contract status tracking (Active, Completed, Terminated)
- Generate S75 Supporting Statements

---

## 12. Variations

**URL:** `/user/variations`
**Access:** All users with active subscription

### Variation Management

| Action | URL | Description |
|--------|-----|-------------|
| **List** | `/user/variations` | View all variations |
| **Add** | `/user/variations/add` | Create a new variation |
| **Edit** | `/user/variations/edit/[id]` | Update variation details |
| **View** | `/user/variations/view/[id]` | View variation details (read-only) |

### Features
- Track changes to contract scope and value
- Variation approval workflow
- Link to parent contract
- Impact on contract totals and payment schedules

---

## 13. Payment Claims (PayApps)

**URL:** `/user/claims`
**Access:** All users with active subscription

### Payment Claim Management

| Action | URL | Description |
|--------|-----|-------------|
| **List** | `/user/claims` | View all payment claims (receivable and billable) |
| **Add** | `/user/claims/add` | Create a new payment claim |
| **Edit** | `/user/claims/edit/[id]` | Update claim details |
| **View** | `/user/claims/view/[...id]` | View claim details and status |
| **Add Payment** | `/user/claims/payments/add` | Record a payment against a claim |

### Claim Types
- **Receivable:** Claims you submit to receive payment (as subcontractor)
- **Billable:** Claims submitted to you for payment (as head contractor)

### Claim Workflow
1. Create claim with amount, description, and supporting documents
2. Submit claim to the relevant party
3. Payment schedule generated based on contract terms
4. Payment received/made and recorded
5. Retention amounts tracked separately
6. Transaction matched in bank reconciliation

### S75 Supporting Statements
- Generated automatically when head contractors make payment claims
- Required under the BIF Act for trust account compliance

---

## 14. Payments & Retention

### Payments To Do
**URL:** `/user/payments-to-do`
**Access:** All users

**Features:**
- Lists all pending payments that require action
- Shows upcoming payment deadlines
- Quick links to process payments

### Payments List
**URL:** `/user/payments-list`
**Access:** All users

**Features:**
- Complete history of all payments (made and received)
- Filter by status, date range, contract
- Export to Excel/PDF

### Retention List
**URL:** `/user/retention-list`
**Access:** All users

**Features:**
- Track all retention amounts held and released
- Monitor retention trust account compliance
- View retention release schedules
- Generate retention-related notices

---

## 15. Bank & Trust Accounts

### Trust Account Limits by Plan
- **Basic:** 2 accounts
- **Standard:** 2 accounts
- **Advanced:** 10 accounts
- **Pro Audit:** Unlimited accounts

### Account Types
1. **General Cash Account:** Standard business operating account
2. **Project Trust Account (PTA):** Mandated under BIF Act for eligible projects
3. **Retention Trust Account (RTA):** Holds retention money as required by BIF Act

### Bank Account Management

| Action | URL | Description |
|--------|-----|-------------|
| **Current Accounts** | `/user/bank-accounts/current` | Active bank accounts |
| **Archived Accounts** | `/user/bank-accounts/archived` | Closed/archived accounts |
| **Add Account** | `/user/bank-accounts/add` | Create a new bank/trust account |
| **Edit Account** | `/user/bank-accounts/edit/[...id]` | Update account details |
| **Account Overview** | `/user/bank-accounts/overview/[...data]` | Detailed account dashboard |
| **Bank Statement** | `/user/bank-accounts/overview/bank-statement` | View/import bank statements |

### Transaction Management

| Action | URL | Description |
|--------|-----|-------------|
| **Upload Transactions** | `/user/bank-accounts/update-transactions/[...id]` | Import bank transactions (CSV/manual) |
| **Match Transactions** | `/user/bank-accounts/match-transactions/[...id]` | Reconcile transactions with claims |
| **Unmatch Transactions** | `/user/bank-accounts/unmatch-transactions/[...id]` | Undo transaction matching |

### Interest Charges & Other Payments

| Action | URL | Description |
|--------|-----|-------------|
| **Add** | `/user/bank-accounts/overview/interest-charges/add` | Record interest or other charges |
| **View** | `/user/bank-accounts/overview/interest-charges/view/[...id]` | View charge details |
| **Edit** | `/user/bank-accounts/overview/interest-charges/edit/[...id]` | Update charge details |

### ABA File Generation
- **Available:** Standard, Advanced, Pro Audit plans
- Generates Australian Bankers Association (ABA) payment files for bulk payments

### Bank Feeds
- **Available:** Standard, Advanced, Pro Audit plans
- Automated bank transaction imports via Open Banking (Adatree CDR integration)

---

## 16. Trust Accounting

**URL:** `/user/trust-accounting`
**Access:** All users with trust accounts

### Trust Accounting Suite

| Page | URL | Description |
|------|-----|-------------|
| **Overview** | `/user/trust-accounting` | Trust accounting dashboard |
| **Journals** | `/user/trust-accounting/journals` | View and manage journal entries |
| **Account Ledger** | `/user/trust-accounting/account-ledger` | Detailed ledger for each account |
| **Trial Balance** | `/user/trust-accounting/trial` | Generate trial balance reports |
| **Deposits** | `/user/trust-accounting/deposits` | Track trust account deposits |

### Audit Management (Pro Audit Only)

| Action | URL | Description |
|--------|-----|-------------|
| **Audit List** | `/user/trust-accounting/audit` | View all audit records |
| **Add Audit** | `/user/trust-accounting/audit/add` | Create a new audit record |
| **Edit Audit** | `/user/trust-accounting/audit/edit/[id]` | Update audit details |
| **View Audit** | `/user/trust-accounting/audit/view/[id]` | View audit details (read-only) |

### Reconciliation Records

| Action | URL | Description |
|--------|-----|-------------|
| **List** | `/user/trust-accounting/reconciliation-record` | Monthly reconciliation records |
| **Add** | `/user/trust-accounting/reconciliation-record/add` | Create a reconciliation record |
| **Edit** | `/user/trust-accounting/reconciliation-record/edit/[id]` | Update reconciliation |
| **View** | `/user/trust-accounting/reconciliation-record/view/[id]` | View reconciliation (read-only) |

### Key Trust Accounting Concepts
- **Journal Entries:** Automated entries created from payment claims and bank transactions
- **Reconciliation:** Monthly requirement under BIF Act - matching trust account bank balance against ledger
- **Trial Balance:** Financial statement showing all account balances for a reporting period
- **Audit:** External audit tracking as required by QBCC regulations (Pro Audit plan only)
- **7-Year History:** Trust records retained for statutory compliance period

---

## 17. Compliance Monitoring

**URL:** `/user/compliances`
**Access:** All users

### Compliance Overview
**URL:** `/user/compliances/overview`

**Features:**
- Dashboard showing compliance status across all projects
- **Status Types:** "Ok" (compliant) or "Action Required" (issues detected)
- Automated checks for PTA and RTA compliance
- Links to specific compliance issues that need resolution

### Compliance Checks Include
- Project trust account establishment within required timeframes
- Correct beneficiaries recorded for each trust
- Monthly reconciliation completed
- Required notices sent/received
- Payment claim deadlines met
- Retention trust account compliance

---

## 18. Notices

**URL:** `/user/notices`
**Access:** All users

### Notice Types (QBCC Statutory Notices)

| Notice | Code | Description |
|--------|------|-------------|
| **Account Opening** | QBCC TA1 | Project/Retention Trust Account opening notice |
| **Account Closing** | QBCC TA2 | Trust account closing notice |
| **Related Entities** | QBCC TA3 | Notice of related entities for the trust |
| **Part Payment** | QBCC TA4 | Notice of partial payment made |
| **Nil Return** | QBCC TA5 | Notice that no withdrawals were made in the period |
| **S75 Supporting Statement** | S75 | Supporting statement for payment claims |

### Notice Management

| Action | URL | Description |
|--------|-----|-------------|
| **Notice List** | `/user/notices` | View all notices (sent and received) |
| **Add Notice** | `/user/notices/add` | Generate a new notice |
| **View Notice** | `/user/notices/view/[id]` | View notice details |
| **View Received Notice** | `/user/notices/receivedview/[id]` | View a notice received from another party |
| **Send Notices** | `/user/notices/send-notices` | Bulk notice sending interface |

### Notice Generation
- **Basic Plan:** Manual notice generation only
- **Standard/Advanced/Pro Audit:** Automated notice generation based on compliance triggers
- Notices are generated as PDF documents using Puppeteer
- PDFs stored in Replit Object Storage
- Email delivery of notices to relevant parties

---

## 19. Integrations (Xero)

**URL:** `/user/integrations`
**Access:** Advanced and Pro Audit plans only

### Xero Integration Pages

| Page | URL | Description |
|------|-----|-------------|
| **Integration List** | `/user/integrations` | View active integrations |
| **Archived** | `/user/integrations/archived` | View disconnected integrations |
| **Xero Dashboard** | `/user/integrations/xero` | Xero connection status and actions |
| **Xero Settings** | `/user/integrations/xero/settings` | Configure Xero sync settings |
| **Xero Bank Accounts** | `/user/integrations/xero/bankAccounts` | Map Xero bank accounts |
| **Xero Invoices** | `/user/integrations/xero/invoices` | View synced invoices |
| **Xero Bills** | `/user/integrations/xero/bills` | View synced bills |
| **Sync Log** | `/user/integrations/xero/syncLogDetails/[id]` | View sync history and errors |

### Xero Features
- OAuth2 connection to Xero (`/xero/callback`)
- Sync contacts (clients/suppliers) between PayTrade and Xero
- Sync invoices and bills
- Map Xero bank accounts to PayTrade trust accounts
- Automatic project mapping
- Detailed sync logs for troubleshooting

---

## 20. Community

### Public Community Pages
The community section is publicly viewable but requires authentication for interaction.

| Page | URL | Description |
|------|-----|-------------|
| **Community Home** | `/community` | Overview with discussions and product ideas |
| **Discussions** | `/community/discussions` | Forum-style Q&A discussions |
| **Product Ideas** | `/community/product-ideas` | Feature request board |
| **Start Discussion** | `/community/start-discussion` | Create a new discussion (auth required) |
| **Create Product Idea** | `/community/create-product-idea` | Submit a feature request (auth required) |

### User Actions
- **Create Content:** Start discussions or submit product ideas (requires authentication)
- **Comment/Answer:** Reply to discussions with answers, or comment on product ideas
- **Like:** Like discussions and individual answers/comments
- **Vote:** Upvote product ideas to signal demand
- **Flag/Report:** Report inappropriate content with reason (Inappropriate/Spam)
- **Search:** Full-text search across all community content
- **Filter by Category:** Browse by topic category

### Best Answer System
- The answer with the most likes on a discussion is highlighted as the "Best Answer"

### Community Bot (AI-Generated Content)
- An AI bot system generates realistic Q&A content using OpenAI GPT-4o
- Bot users are created with Australian construction industry personas
- Content focuses on BIF Act compliance and trust accounting topics
- Scheduled to run Mon/Wed/Fri at 9 AM UTC
- Admins can manually trigger generation from the admin panel

---

## 21. User Settings & Security

### Personal Information
**URL:** `/user/personal-info`

**Actions:**
- Update name, phone number, address
- Change profile photo
- Update occupation and position title

### Sign-in & Security
**URL:** `/user/sign-in-security`

**Actions:**
- Change password (current password required)
- Password complexity enforced
- View login history

### Activity Log
**URL:** `/user/activity-log`

**Actions:**
- View complete audit trail of all actions taken in the system
- Filter by date range, action type
- Track login/logout events, data changes, document generation

### Subscription Management
**URL:** `/user/manage-subscriptions/upgrade-plan`

**Actions:**
- View current plan details
- Compare plan features
- Upgrade to a higher tier
- Stripe checkout integration for payment
- View billing history and invoices

---

## 22. Admin Panel

### Admin Authentication
**URL:** `/admin/login`

Admin accounts are stored separately in the `admin_details` table (not `user_details`).

### Admin Dashboard
**URL:** `/admin/dashboard`

**Widgets:**
- New Users count
- New Businesses count
- Notices pending
- Compliance issues
- Failed subscription transactions
- Trust accounting issues
- Quick access to all admin sections

### User & Business Management

| Page | URL | Description |
|------|-----|-------------|
| **Manage Users** | `/admin/users` | List, search, filter all platform users |
| **Add User** | `/admin/users/add` | Create a new user account |
| **Edit User** | `/admin/users/edit/[id]` | Update user details, block/unblock |
| **Manage Businesses** | `/admin/business` | List all business profiles |
| **Add Business** | `/admin/business/add` | Create a new business profile |
| **Edit Business** | `/admin/business/edit/[id]` | Update business details |

**User Management Actions:**
- Edit user details
- Mark as contacted/uncontacted
- Block/unblock users
- Reset password (sends new password via email)
- Login as user (Super Admin only, requires admin password)
- Enable/disable free premium access
- **Generate Bot Users** (creates AI-generated bot user personas)

### Admin Users (Internal)

| Page | URL | Description |
|------|-----|-------------|
| **Admin Users List** | `/admin/admin-users` | List all admin accounts |
| **Add Admin User** | `/admin/admin-users/add` | Create a new admin |
| **Edit Admin User** | `/admin/admin-users/edit/[id]` | Update admin details |

### Community Management

| Page | URL | Description |
|------|-----|-------------|
| **Discussions** | `/admin/community/discussions` | Manage all discussions |
| **Product Ideas** | `/admin/community/product-ideas` | Manage all product ideas |
| **Reported Content** | `/admin/community/discussions/reported/[id]` | Review flagged content |
| **Comments** | `/admin/community/discussions/comments/[id]` | Manage answers/comments |

**Community Admin Actions:**
- View, delete discussions and product ideas
- Review and moderate reported content
- View archived (deleted) comments
- **Generate Bot Question** (creates AI-generated Q&A discussion)
- **Generate Bot Answers** (creates AI-generated answers for a specific discussion)

### Content Management

| Page | URL | Description |
|------|-----|-------------|
| **FAQ List** | `/admin/content-management/faq` | Manage FAQ entries |
| **Add FAQ** | `/admin/content-management/faq/add` | Create new FAQ |
| **Edit FAQ** | `/admin/content-management/faq/edit/[id]` | Update FAQ |
| **Email Templates** | `/admin/content-management/email` | View/edit system email templates |

### Blog Management

| Page | URL | Description |
|------|-----|-------------|
| **Blog List** | `/admin/blog` | List all blog posts |
| **Edit Blog Post** | `/admin/blog/edit/[id]` | Create/update blog articles |

### Resource Guides

| Page | URL | Description |
|------|-----|-------------|
| **Resource List** | `/admin/resource` | List resource articles |
| **Add Resource** | `/admin/resource/add` | Create new resource |
| **Edit Resource** | `/admin/resource/edit/[id]` | Update resource |

### How-to Guides

| Page | URL | Description |
|------|-----|-------------|
| **Guides List** | `/admin/how-to-guides` | List how-to guides |
| **Add Guide** | `/admin/how-to-guides/add` | Create new guide |
| **Edit Guide** | `/admin/how-to-guides/edit/[id]` | Update guide |

### SEO Keywords
**URL:** `/admin/seo-keywords`

**Actions:**
- Add/edit/delete SEO keywords
- Configure landing page metadata (title, description, H1, content)
- Keywords drive dynamic `/topics/[slug]` pages
- Active keywords feed into community bot topic selection
- Included in sitemap generation

### Communication Management

| Page | URL | Description |
|------|-----|-------------|
| **Communication List** | `/admin/communication` | View all admin communications |
| **Add Communication** | `/admin/communication/add` | Create and send system-wide emails |
| **View Communication** | `/admin/communication/view/[id]` | View sent communication details |

### Notices (Admin View)

| Page | URL | Description |
|------|-----|-------------|
| **Current Notices** | `/admin/notices/current` | View active notices across all users |
| **Archived Notices** | `/admin/notices/archive` | View historical notices |
| **View Notice** | `/admin/notices/view/[id]` | Detailed notice view |

### Compliance (Admin View)

| Page | URL | Description |
|------|-----|-------------|
| **Compliance Overview** | `/admin/compliances` | Platform-wide compliance dashboard |
| **Manage Compliances** | `/admin/manage-compliances` | Configure compliance rules |

### Subscription & Billing Management

| Page | URL | Description |
|------|-----|-------------|
| **Current Plans** | `/admin/subscriptions/current` | Active subscription plans |
| **Archived Plans** | `/admin/subscriptions/archived` | Inactive plans |
| **Add Plan** | `/admin/subscriptions/add` | Create new subscription plan |
| **Edit Plan** | `/admin/subscriptions/edit/[id]` | Update plan details and pricing |
| **View Plan** | `/admin/subscriptions/view/[id]` | View plan details |
| **Manage Items** | `/admin/subscriptions/manage-items/current` | Plan feature items (current) |
| **Archived Items** | `/admin/subscriptions/manage-items/archived` | Inactive items |
| **Add Item** | `/admin/subscriptions/manage-items/add` | Create new plan item |
| **Edit Item** | `/admin/subscriptions/manage-items/edit/[id]` | Update item |
| **Manage Coupons** | `/admin/subscriptions/manage-coupons/current` | Active discount codes |
| **Archived Coupons** | `/admin/subscriptions/manage-coupons/archived` | Expired coupons |
| **Add Coupon** | `/admin/subscriptions/manage-coupons/add` | Create Stripe coupon |
| **Edit Coupon** | `/admin/subscriptions/manage-coupons/edit/[id]` | Update coupon |
| **Subscription Profiles** | `/admin/subscriptions/manage-profiles` | View user subscription status |
| **Billing History** | `/admin/subscriptions/billing-history` | All transactions, failed payments |

### System Configuration (Masters)

| Page | URL | Description |
|------|-----|-------------|
| **Masters List** | `/admin/masters` | Global dropdown values and constants |
| **Edit Master** | `/admin/masters/edit/[id]` | Update master value |
| **Currency List** | `/admin/currency` | Supported currencies |
| **Edit Currency** | `/admin/currency/edit/[id]` | Update currency details |
| **Financial Institutions** | `/admin/financial-institution` | Bank/institution details |
| **Edit Institution** | `/admin/financial-institution/edit/[id]` | Update institution |
| **Holidays** | `/admin/holidays` | Public holidays affecting payment deadlines |
| **Add Holiday** | `/admin/holidays/add` | Create holiday entry |
| **Edit Holiday** | `/admin/holidays/edit/[id]` | Update holiday |
| **View Holiday** | `/admin/holidays/view/[id]` | View holiday details |
| **Delegation** | `/admin/delegation` | QBCC regulatory delegation settings |

### Groups & Permissions
**URL:** `/admin/groups`

**Actions:**
- Define user groups with granular permissions
- Set permissions per module: View, Insert, Update, Delete, Print, Export
- Assign groups to admin users

### Admin Journal & Trust Accounting

| Page | URL | Description |
|------|-----|-------------|
| **Journals** | `/admin/journals` | Platform-wide journal overview |
| **Trust Accounting** | `/admin/journals/trust-accounting` | Trust account oversight |

### Admin Settings

| Page | URL | Description |
|------|-----|-------------|
| **Personal Info** | `/admin/personal-info` | Admin profile management |
| **Sign-in & Security** | `/admin/sign-in-security` | Password and security settings |
| **Activity Log** | `/admin/activity-log` | Full audit trail of admin actions |

---

## 23. Full System Flow: End-to-End

This section describes the typical lifecycle of a user on PayTrade, from registration through to ongoing trust account management.

### Phase 1: Discovery & Registration
1. User discovers PayTrade via public landing pages (`/`, `/headcontractors`, `/subcontractors`, etc.)
2. Reviews pricing plans at `/pricing`
3. Reads educational content on `/blog`, `/articles`, `/how-to-guides`
4. Signs up at `/user/login` (sign-up tab)
5. Completes multi-step registration (email verification, personal details, business profile, tax info)
6. System creates personal company with Free subscription
7. Redirected to `/user/dashboard`

### Phase 2: Business Setup
1. Completes business profile with ABN, QBCC license at `/user/edit-business-profile`
2. Adds clients and suppliers at `/user/clients-suppliers/add`
3. Evaluates subscription needs based on project count
4. If needed, upgrades plan at `/user/manage-subscriptions/upgrade-plan`

### Phase 3: Project & Contract Creation
1. Creates a project at `/user/projects/add`
2. Uses eligibility checker to determine if PTA is required
3. Creates contracts at `/user/contracts/add`, linking to the project and subcontractors
4. Defines payment schedules, retention percentages, and variation terms

### Phase 4: Trust Account Setup
1. Opens bank/trust accounts at `/user/bank-accounts/add`
2. Selects account type: PTA, RTA, or General Cash
3. Links trust accounts to specific projects
4. Generates **QBCC TA1** opening notice at `/user/notices/add`
5. Sends notice to QBCC and relevant parties

### Phase 5: Ongoing Payment Management
1. Subcontractor submits payment claim at `/user/claims/add`
2. Head contractor reviews and processes claim
3. Payment is made and recorded
4. S75 Supporting Statement generated automatically
5. Payment appears in trust account transactions
6. Transaction matched via `/user/bank-accounts/match-transactions/[id]`

### Phase 6: Trust Account Administration
1. Records trust account deposits at `/user/trust-accounting/deposits`
2. Reviews journal entries at `/user/trust-accounting/journals`
3. Generates account ledger at `/user/trust-accounting/account-ledger`
4. Performs monthly reconciliation at `/user/trust-accounting/reconciliation-record/add`
5. Generates trial balance at `/user/trust-accounting/trial`
6. **Pro Audit only:** Records audit details at `/user/trust-accounting/audit/add`

### Phase 7: Compliance & Notices
1. System automatically monitors compliance across all projects
2. Compliance dashboard at `/user/compliances/overview` shows status
3. Issues flagged as "Action Required" with guidance on resolution
4. Notices generated as needed:
   - **TA1:** Account opening/closing notices
   - **TA3:** Related entities disclosure
   - **TA4:** Part payment notices
   - **TA5:** Nil return periods
5. Notices sent via email with PDF attachments

### Phase 8: Retention Management
1. Retention amounts tracked automatically from contract terms
2. Retention list at `/user/retention-list` shows all held retentions
3. RTA compliance monitored
4. Retention release triggered when contractual conditions met
5. QBCC notices generated for retention account events

### Phase 9: Integration & Automation (Advanced/Pro Audit)
1. Connect Xero at `/user/integrations/xero`
2. Map Xero bank accounts and contacts
3. Sync invoices, bills, and payments bidirectionally
4. Bank feeds provide automated transaction imports
5. ABA file generation for bulk payments
6. Delegate authority to other users (Advanced/Pro Audit)

### Phase 10: Community Engagement
1. Browse community discussions at `/community/discussions`
2. Ask questions about BIF Act compliance and trust accounting
3. Share knowledge and best practices
4. Vote on product ideas at `/community/product-ideas`
5. Submit feature requests

### Phase 11: Account Closure
1. When a project completes, generate **QBCC TA2** account closing notice
2. Final reconciliation performed
3. Trust account archived
4. All records retained for 7-year statutory period
5. Audit trail preserved in activity log

---

*This document covers every user-accessible page, admin function, and feature in the PayTrade platform as of the current codebase. Plan features and pricing are dynamically managed by admins via the subscription management system and may change over time.*
