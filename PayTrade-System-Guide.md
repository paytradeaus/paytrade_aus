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
| **Xero Integration** | No | No | No | Yes |
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
- Import from Xero (Pro Audit plan only)

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

#### Xero Integration on Save
When a user saves a new bank account and the Xero integration is connected and active, a dialog appears asking: "Would you like to also create this account in Xero?"
- **Yes:** The account is immediately created in Xero and auto-mapped. The user is then redirected to the bank accounts list.
- **No:** The account is saved in PayTrade only, and it is marked to skip automatic Xero creation by the hourly scheduler. The user is redirected to the bank accounts list.
- **Dismiss (X button):** The account is saved normally. If the "PT → Xero Bank Auto-Create" toggle is enabled in Xero Settings, the hourly scheduler may create it in Xero later.

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
**Access:** Pro Audit plan only

### Xero Integration Pages

| Page | URL | Description |
|------|-----|-------------|
| **Integration List** | `/user/integrations` | View all integrations, connect/disconnect/pause |
| **Archived** | `/user/integrations/archived` | View disconnected integrations |
| **Xero Dashboard** | `/user/integrations/xero` | Connection status, sync statistics, onboarding wizard, sync logs |
| **Xero Settings** | `/user/integrations/xero/settings` | Chart of accounts, tax rates, tracking categories, sync preferences |
| **Xero Bank Accounts** | `/user/integrations/xero/bankAccounts` | Map Xero bank accounts to PayTrade trust/cash accounts |
| **Xero Contacts** | `/user/integrations/xero/contacts` | Map Xero contacts to PayTrade clients/suppliers |
| **Xero Projects** | `/user/integrations/xero/projects` | Map Xero tracking category options to PayTrade projects |
| **Xero Contracts** | `/user/integrations/xero/contracts` | Map Xero tracking category options to PayTrade contracts |
| **Xero Invoices** | `/user/integrations/xero/invoices` | View and manage synced invoices |
| **Xero Bills** | `/user/integrations/xero/bills` | View and manage synced bills |
| **Sync Log Details** | `/user/integrations/xero/syncLogDetails/[id]` | View detailed sync history, compare records, resolve errors |

### 19.1 Connection and Authentication

- **OAuth2 Flow:** Users click "Connect" on the Integration List page, which redirects to Xero for authorisation. After granting consent, Xero redirects back to PayTrade via `/xero/callback` with an auth code.
- **Token Storage:** Access and refresh tokens are stored in the `XeroIntegrationDetails` entity, linked to the company.
- **Automatic Token Refresh:** A BullMQ job (`xero-refresh-token`) runs every 23 hours to refresh tokens before they expire.
- **Re-authentication:** If a refresh token fails (e.g., user revoked access in Xero), the system returns an `XERO_REFRESH` status, automatically redirecting the user to re-authorise.
- **Integration Actions:** From the Integration List, users can Connect, Disconnect, Pause, Unpause, or Delete the Xero integration.
- **Subscription Check:** The system verifies the company is on a Pro Audit plan before allowing connection.

### 19.2 Onboarding Wizard (Xero Dashboard)

The Xero Dashboard provides a 6-step onboarding wizard for initial setup:

1. **Settings/Mapping** — Configure chart of accounts, tax rates, and tracking categories
2. **Bank Account Mapping** — Link Xero bank accounts to PayTrade trust/cash accounts
3. **Contact Mapping** — Link Xero contacts to PayTrade clients/suppliers
4. **Project Tracking Category Mapping** — Map a Xero tracking category to represent PayTrade projects
5. **Contract Tracking Category Mapping** *(optional)* — Map a Xero tracking category to represent PayTrade contracts. This step is optional — the system can auto-resolve contracts using smart matching (see 19.5).
6. **Activate** — Set the integration to Active status

The dashboard also displays sync statistics (Synced vs. Pending counts) for Bank Accounts, Contacts, Projects, Contracts, Bills, and Invoices, and a table of recent Sync Logs.

### 19.3 Xero Settings Configuration

#### Chart of Account Mappings
Users map PayTrade financial activities to specific Xero account codes:

| Setting | Purpose |
|---------|---------|
| **Invoice Code** | Revenue account for synced receivable invoices |
| **Bill Code** | Expense account for synced payable bills |
| **Retention Payable Retained Code** | Account for retention amounts held (payable) |
| **Retention Payable Release Code** | Account for retention amounts released (payable) |
| **Retention Receivable Retained Code** | Account for retention amounts held (receivable) |
| **Retention Receivable Release Code** | Account for retention amounts released (receivable) |
| **Liability Payable Code** | Account for payable liabilities (defects period) |
| **Liability Receivable Code** | Account for receivable liabilities (defects period) |

Users can also create new Xero accounts directly from this screen by specifying Account Type, Code, and Name.

#### Tax Rate Configuration
- **Invoice Tax Code:** Default tax rate for invoices synced to Xero
- **Bill Tax Code:** Default tax rate for bills synced to Xero
- Users can create new tax rates with custom components, compound tax support, and report tax type (Input, Output, None, Exempt)

#### Tracking Categories
- **Project Tracking Category:** A Xero tracking category that represents PayTrade "Projects"
- **Contract Tracking Category:** A Xero tracking category that represents PayTrade "Contracts"
- The system prevents using the same tracking category for both
- Users can create new tracking categories directly from Settings

#### Sync Preferences (Draft vs. Approved)

| Direction | Setting | Options |
|-----------|---------|---------|
| PayTrade → Xero | Invoice sync status | Draft or Approved |
| PayTrade → Xero | Bill sync status | Draft or Approved |
| PayTrade → Xero | Payment sync status | Draft or Approved |
| Xero → PayTrade | Invoice sync status | Draft or Approved |
| Xero → PayTrade | Bill sync status | Draft or Approved |
| Xero → PayTrade | Payment sync status | Draft or Approved |

#### Bank Account Auto-Create Settings

| Setting | Direction | Description |
|---------|-----------|-------------|
| **PT → Xero Bank Auto-Create** | PayTrade → Xero | When enabled, the hourly scheduler automatically creates matching Xero bank accounts for any unmapped PayTrade bank accounts |
| **Xero → PT Bank Auto-Create** | Xero → PayTrade | When enabled, the hourly scheduler automatically creates draft PayTrade bank accounts for any unmapped Xero bank accounts. Draft accounts require additional details (account type, financial institution, opening date, etc.) before they become active |

#### Contact Auto-Create Settings

| Setting | Direction | Description |
|---------|-----------|-------------|
| **PT → Xero Contact Auto-Create** | PayTrade → Xero | When enabled, the hourly scheduler automatically creates matching Xero contacts for any unmapped PayTrade clients/suppliers |
| **Xero → PT Contact Auto-Create** | Xero → PayTrade | When enabled, the hourly scheduler automatically creates PayTrade clients/suppliers for any unmapped Xero contacts. The contact type is determined automatically: Xero contacts flagged as "Customer" become Clients in PayTrade, all others become Suppliers. Users can change the type after import. |

These toggles are found at the bottom of the Xero Settings page under the auto-creation sections.

#### Other Settings
- **Reference Format:** Customise the reference prefix for synced documents
- **Webhook Wait Time:** Delay (0–60 minutes) for background sync processing

### 19.4 Entity Mapping (Bank Accounts, Contacts, Projects, Contracts)

Each mapping module follows the same pattern with three tabs:

- **PayTrade [Entity]s Tab:** Shows entities in PayTrade that are not yet mapped
- **Xero [Entity]s Tab:** Shows entities in Xero that are not yet mapped
- **Mapped Tab:** Shows successfully linked entity pairs

#### Mapping Methods

1. **Auto Map:** Automatically matches entities by name. Available via the "AUTO MAP" button on the Mapped tab.
2. **Manual Map:** User selects the corresponding entity from a searchable dropdown modal.
3. **Sync to Xero:** Creates a new record in Xero from a PayTrade entity and establishes the mapping.
4. **Sync to PayTrade:** Creates a new record in PayTrade from a Xero entity and establishes the mapping.
5. **Unmap:** Breaks an existing link between two entities, allowing re-mapping.

#### Bank Account Mapping
- Links Xero bank accounts to PayTrade Cash Accounts, Project Trust Accounts (PTA), or Retention Trust Accounts (RTA)
- Critical for invoice/bill sync — the correct trust account must be linked
- **Create in Xero button:** On the PayTrade Bank Accounts tab, each unmapped row has a "Create in Xero" action button (plus icon). Clicking it shows a confirmation prompt, then creates the corresponding bank account in Xero and auto-maps it.
- **Create in PayTrade button:** On the Xero Bank Accounts tab, each unmapped row has a "Create in PayTrade" action button (plus icon). Clicking it shows a confirmation prompt, then creates a draft bank account in PayTrade. Draft accounts may require additional details before becoming fully active.
- **Xero prompt on bank account save:** When a user saves a new bank account while Xero is connected, the system prompts: "Would you like to also create this account in Xero?" Choosing Yes immediately creates the account in Xero. Choosing No marks the account to skip automatic creation by the scheduler. Dismissing the prompt leaves the account eligible for auto-creation if the toggle is enabled.

#### Contact Mapping
- Links Xero contacts to PayTrade clients and suppliers
- Contacts must be mapped before invoices/bills referencing them can sync
- **Create in Xero button:** On the PayTrade Contacts tab, each unmapped row has a "Create in Xero" action button (plus icon). Clicking it shows a confirmation prompt, then creates the corresponding contact in Xero and auto-maps it.
- **Create in PayTrade button:** On the Xero Contacts tab, each unmapped row has a "Create in PayTrade" action button (plus icon). Clicking it shows a confirmation prompt, then creates a client/supplier in PayTrade. The type (Client or Supplier) is determined automatically from Xero's `isCustomer` flag — customers become Clients, all others become Suppliers. Users can change the type after import. Contacts with missing required fields (e.g. no address or email) are flagged and require the user to complete a pre-filled form.
- **Create All in PayTrade:** A batch button on the Xero Contacts tab that creates all unmapped Xero contacts in PayTrade in one operation. Contacts with missing required fields are skipped (counted in the results summary).
- **Create All in Xero:** A batch button on the PayTrade Contacts tab that creates all unmapped PayTrade contacts in Xero in one operation.
- **Close button:** Returns to the Xero Dashboard.

#### Project and Contract Mapping
- Uses Xero Tracking Category Options (not separate Xero entities)
- Each PayTrade project maps to a tracking category option in Xero — this is required
- Contract mapping is **optional** — see section 19.5 for smart contract resolution
- Tracking categories must be configured in Settings before mapping

### 19.5 Smart Contract Resolution *(Updated 2026-03-29)*

Contract tracking category mapping is optional. The system uses a smart resolution process to determine which contract a claim belongs to:

1. **Tracking ID match:** If a contract tracking category is configured and the contract is mapped, it is used directly.
2. **Single contract match:** If tracking doesn't resolve, the system checks how many active contracts exist for the same supplier and project. If there is exactly one, it is used automatically.
3. **Amount match:** If multiple contracts exist, the system compares the claim/invoice total against each contract's adjusted value (initial contract sum + approved variations). If exactly one matches, it is used.
4. **Ambiguity failure:** The sync only fails if none of the above resolve a unique contract. The user is prompted to map the contract via the Sync Log Details resolve workflow.

**When is contract mapping required?**
Only when a supplier has 2+ contracts under the same project AND the claim amount doesn't uniquely match one contract's value. This is an edge case.

### 19.6 Invoice and Bill Synchronisation

#### PayTrade → Xero Export
1. **Eligibility:** Only payment claims with status "Draft" or "Confirmed" can be exported
2. **Pre-checks:** System validates that the client/supplier and project are mapped to Xero (contract mapping is optional — see 19.5)
3. **Account Validation:** Verifies required Xero account codes (revenue, liability, retention) and tax codes are configured
4. **Payload Construction:**
   - Determines type: `ACCREC` (Receivable/Invoice) or `ACCPAY` (Payable/Bill)
   - Maps dates, reference numbers, GST settings, and line items
   - **Retention Handling:** If retention is applicable, the system splits amounts across multiple line items using dedicated retention account codes
5. **Status:** Created in Xero as Draft or Approved based on sync preferences
6. **Tracking:** The resulting Xero Invoice ID is saved in `XeroInvoicesBills` entity

#### Xero → PayTrade Import
1. **Duplicate Check:** Ensures the Xero invoice isn't already mapped to a PayTrade claim
2. **Validation:**
   - At least one line item required
   - Valid project tracking category must be present (contract tracking is optional — resolved via smart matching per 19.5)
   - Account codes and tax codes must match PayTrade configuration
   - Total amount cannot exceed the contract size
3. **Retention Calculation:** Back-calculates original item prices and retention percentages from Xero's specialised line items
4. **Claim Creation:** Creates the payment claim in PayTrade via `addPaymentClaim`
5. **Status:** Created as Draft or Approved based on sync preferences

#### Field Mapping

| PayTrade Field | Xero Field | Notes |
|----------------|------------|-------|
| Payment Claim ID | Reference | Prefixed with "Claim" or "Retention claim" |
| Claim Type | Type | Billable → ACCPAY, Receivable → ACCREC |
| Received/Sent Date | Date | Depends on claim type direction |
| Due Date | Due Date | |
| Total (incl. GST) | Unit Amount | Adjusted by retention if applicable |
| Description | Description | Line item description |
| Project | Tracking Category | Uses project tracking category from settings |
| Contract | Tracking Category | Uses contract tracking category from settings |

### 19.7 Payment Synchronisation

#### Payment Types

PayTrade supports several payment types when syncing with Xero:

| PayTrade Payment Type | What It Means | When It Applies |
|---|---|---|
| **Standard Payment** | Full payment of an invoice or bill | Payment amount matches the invoice/bill total |
| **Part Payment** | Partial payment, remainder still outstanding | Payment is less than the invoice total with no credit note |
| **Pay Less** | Payment with a deduction (e.g., defect back-charge) | Payment + credit note reduces the effective total owed |
| **Overpayment** | Payment exceeds what is owed | Payment amount is greater than the invoice total |
| **Overpayment Refund** | Refund of a previous overpayment | Refund applied against an existing overpayment |
| **Credit Note** | Reduction of an invoice/bill amount | Standalone credit note allocated against an invoice |
| **Retention Transfer** | Retention portion moved to trust account | Cash retention transferred to the retention bank account alongside a standard payment |

Payment sync follows the same Draft/Approved preference as invoices/bills.

#### Why Some Syncs Take Time

In construction, many payment types involve **multiple steps** before PayTrade can determine the correct classification. When Xero notifies PayTrade of a change (e.g., a payment applied to an invoice), that first notification may only be the beginning of a larger transaction.

**Example:** A partial payment is applied in Xero. At this point it could become:
- A **Part Payment** — if the remainder stays outstanding
- A **Pay Less** — if a credit note follows, formally reducing the amount owed
- The first of **multiple payments** leading to full settlement

Because PayTrade cannot distinguish between these outcomes from the first notification alone, the system uses a configurable **Processing Wait Time** (0–60 minutes, set in Xero Settings) to delay processing. After the wait period, PayTrade reads the complete state of the invoice from Xero — including all payments, credit notes, and overpayments that have been recorded in the meantime — and then determines the correct payment type.

**What this means for users:**
- If a payment sync hasn't appeared yet, it is likely waiting for the configured delay to elapse before processing.
- The wait time allows PayTrade to make an accurate decision rather than guessing. After the wait expires, the system determines the payment type based on all available records.
- The daily sync (1:00 PM UTC) processes everything in a single pass and does not use the wait time — it reads the complete current state directly.
- Failed syncs retry automatically and are logged in the Sync Log for review if needed.

The **Processing Wait Time** setting is found under **Xero Settings → Other Settings**.

### 19.8 Automated Sync

#### Daily Cron Job
- Runs at **1:00 PM UTC daily** via `XeroSchedulerService`
- Iterates through all active integrations
- Performs a full refresh: accounts → contacts → projects → contracts → invoices

#### Hourly Bank Account Auto-Create
- Runs **every hour** (on the hour) via `XeroSchedulerService`
- For each active integration with the relevant toggle enabled:
  - **PT → Xero:** Finds unmapped PayTrade bank accounts (excluding those the user declined via the save prompt) and creates them in Xero automatically
  - **Xero → PT:** Finds unmapped Xero bank accounts and creates them in PayTrade as draft accounts. A sync log entry is created with a "missing fields" status so the user can complete the required details (account type, financial institution, opening date, etc.) via the Resolve workflow on the Sync Log Details page
- Accounts that were explicitly declined ("No" at the Xero prompt on save) are marked with `skip_xero_auto_create` and excluded from the scheduler

#### Hourly Contact Auto-Create
- Runs **every hour** (on the hour) via `XeroSchedulerService`, alongside bank account auto-create
- For each active integration with the relevant toggle enabled:
  - **PT → Xero:** Finds unmapped PayTrade clients/suppliers and creates them as contacts in Xero automatically
  - **Xero → PT:** Finds unmapped Xero contacts and creates them as clients/suppliers in PayTrade. Contact type is determined automatically from Xero's `isCustomer` flag (Customer → Client, otherwise → Supplier). Users can change the type after import. Contacts with missing required fields generate a sync log entry (templates 469-470)

#### Real-Time Sync from Xero
- When changes are made in Xero (new contacts, updated invoices, payments applied), PayTrade is notified automatically
- Changes to contacts, invoices, and bills are synced in near-real-time
- Payment changes are subject to the **Processing Wait Time** (see 19.7) to allow multi-step transactions to complete before classification

### 19.9 Sync Logs and Error Resolution

Every sync operation is logged and visible from the **Xero Dashboard**. The Sync Log shows each sync attempt with its status (Succeeded or Failed), the type of record (Contact, Invoice, Bill, Payment), and a timestamp.

#### Viewing Sync Log Details

Click any sync log entry to open the details page, which shows:
- **Visual Comparison:** Side-by-side table comparing PayTrade fields vs. Xero fields
- **Status Indicators:** Each field marked "Ok" (green) or "Failed" (red)
- **Error Message:** A plain-language description of what went wrong

#### Resolving Sync Failures

When a sync fails, the Sync Log Details page shows a **"Resolve"** button. Clicking it will guide you through the appropriate fix — in most cases you do not need to know the technical details. The system determines the resolution type automatically:

| What Failed | What You'll Be Asked To Do |
|---|---|
| **Unmapped contact** | Select the matching PayTrade client or supplier from a dropdown |
| **Unmapped project** | Select the matching PayTrade project from a dropdown |
| **Unmapped contract** | Select the matching PayTrade contract from a dropdown (only when smart resolution cannot determine it — see 19.5) |
| **Unmapped bank account** | Select the matching PayTrade bank account from a dropdown |
| **Bank account missing fields** | A form appears to complete the draft bank account details: account type, financial institution, opening date, delegate powers, and trust-specific fields if applicable. This occurs when Xero auto-creates a draft bank account in PayTrade that needs additional information |
| **Missing or invalid account codes** | Redirected to Xero Settings to correct the chart of accounts configuration |
| **Missing required fields** | Redirected to the relevant edit page to fill in the missing data |
| **Overpayment details missing** | Prompted to provide the missing overpayment information |

After you complete the resolution step, the sync retries automatically.

#### Sync Types That Will Always Need More Information

Some sync failures cannot be resolved automatically and will always require you to provide additional information:

| Scenario | Why It Needs Your Input |
|---|---|
| **Multiple contracts for the same supplier and project** | PayTrade cannot determine which contract the claim belongs to — you need to select the correct one |
| **New contact in Xero not yet in PayTrade** | The contact needs to be created or mapped in PayTrade before the invoice can sync |
| **Account codes changed in Xero** | If your Xero chart of accounts has been modified, PayTrade's settings need updating to match |
| **Overpayment or credit note without a linked original payment** | PayTrade needs to know which original payment the overpayment or credit note relates to |
| **Invoice total exceeds contract value** | The claim amount is larger than the contract allows — review the contract value and any approved variations |

#### What To Do If a Sync Keeps Failing

1. **Check the Sync Log Details** — read the error message and follow the "Resolve" prompts
2. **Verify your Xero Settings** — ensure account codes, tax codes, and tracking categories are correctly configured at Xero Settings → Chart of Accounts
3. **Check entity mappings** — confirm that the relevant contacts, projects, and bank accounts are mapped on the Xero mapping pages
4. **Wait for processing** — if a payment sync hasn't appeared yet, it may still be within the Processing Wait Time (see 19.7). Payment syncs involving part payments, pay less, or overpayments will wait for the configured delay before processing
5. **Check the daily sync** — if a real-time sync failed, the daily sync (1:00 PM UTC) will attempt to process it again with a fresh read of the complete state from Xero
6. **Re-trigger manually** — use the "Resolve" button on the Sync Log Details page to retry after making corrections

#### When To Contact Support

Contact PayTrade support if:
- A sync failure persists after following the resolution steps above
- The error message references an internal system error rather than a mapping or configuration issue
- The same record fails repeatedly across multiple daily syncs
- You see errors related to Xero authentication or token refresh (this may indicate the Xero connection needs to be re-authorised)
- You believe the sync result is incorrect (e.g., a payment was classified as the wrong type)

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

Admin panel documentation has been moved to a separate document: **PayTrade-Admin-Guide.md**

The admin panel covers: user & business management, admin users, community management, content management (FAQ, blogs, resources, how-to guides), SEO keywords, communication management, notices, compliance, subscription & billing management, system configuration (masters, currencies, financial institutions, holidays, delegation), groups & permissions, journal & trust accounting oversight, and admin settings.

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

#### 5a: Submitting a Payment Claim
A payment claim can be submitted by either party depending on the contract relationship:
- **Subcontractor** submits a receivable claim to the head contractor
- **Head contractor** submits a receivable claim to the principal/client

**Steps:**
1. Navigate to **Pay Apps** in the sidebar menu (`/user/claims`)
2. Click the **"Add Claim"** button (top-right)
3. Select the contract the claim relates to
4. Enter claim amount, description, and attach supporting documents
5. Submit the claim — system generates a claim reference number

#### 5b: Reviewing and Approving a Claim
The party receiving the claim reviews and responds:
- **Head contractor** reviews claims from subcontractors
- **Client/Principal** reviews claims from head contractors

**Steps:**
1. Navigate to **Pay Apps** (`/user/claims`) — the claim appears under the **Billable** tab
2. Open the claim to review amounts and documents at `/user/claims/view/[id]`
3. Approve, partially approve, or dispute the claim

#### 5c: Recording a Payment
Once a claim is approved, a payment is recorded against it:
1. From the claim view page (`/user/claims/view/[id]`), click **"Add Payment"**
2. This navigates to `/user/claims/payments/add`
3. Enter payment amount, date, and payment reference
4. S75 Supporting Statement is generated automatically for trust account claims
5. The payment record appears on the **Payments List** page (`/user/payments-list`)

#### 5d: Payments To Do
- Navigate to **Payments To Do** (`/user/payments-to-do`) to see all outstanding payments requiring action
- Each item links directly to the relevant claim for processing

#### 5e: Bank Transaction Reconciliation
After payments are made through the bank, the transactions must be reconciled:
1. Navigate to **Bank Accounts** > select the relevant account > **Account Overview** (`/user/bank-accounts/overview/[id]`)
2. Click **"Upload Transactions"** to import a bank statement CSV file (`/user/bank-accounts/update-transactions/[id]`)
3. Upload the CSV — the system parses and imports each transaction row
4. Navigate to **Match Transactions** (`/user/bank-accounts/match-transactions/[id]`)
5. The system presents unmatched bank transactions alongside unmatched claims/payments

##### Manual Matching
6. Click a bank transaction and the corresponding claim/payment to match them together
7. Click **"Match"** to confirm — the matched pair is removed from the unmatched list
8. Matched transactions update the trust account ledger and compliance status
9. If a match was made in error, use **Unmatch Transactions** (`/user/bank-accounts/unmatch-transactions/[id]`) to reverse it

##### Smart Match (Automated Suggestions)
Smart Match analyses all unmatched transactions and automatically suggests the best payment matches, saving significant time compared to manual matching.

**Enabling Smart Match:**
- Toggle **"Smart Match"** on the Match Transactions page (setting is saved per-browser via localStorage key `pt_smart_match`)
- When enabled, the system calls `fetchBatchSuggestedMatches` to analyse all unmatched transactions at once

**Match Quality Indicators:**
Each transaction row displays a colour-coded quality badge:
- **Green (Exact Match):** The bank transaction amount exactly matches the payment amount — safe to match with one click
- **Amber (Near Match):** The amounts are close but not identical (e.g., bank shows $10,450 but the payment was $10,500) — requires review before matching
- **No badge:** No suitable match was found — use manual matching

**Expandable Transaction Rows:**
- Click on any transaction row with a match suggestion to expand it
- The expanded section shows the matched payment details: claim reference, amount, date, and the variance (if any)

**One-Click Exact Match:**
- For transactions with a green "Exact" badge, click **"Match"** to instantly match the transaction to the suggested payment
- No further confirmation needed — the match is applied immediately

**Match All Exact (Batch):**
- Click the **"Match All Exact"** button to match every transaction with an exact match suggestion in a single action
- The system calls `batchMatchExactTransactions` to process all exact matches atomically
- A summary shows how many transactions were matched

**Quick Adjust & Match (Near Matches):**
When a near match is found (amber badge), the bank amount and payment amount differ slightly:
1. Expand the transaction row to see the suggested match and the variance
2. Click **"Adjust & Match"**
3. The system calls `quickAdjustAndMatch`, which:
   - Automatically creates an adjustment payment (over-payment or under-payment) to bridge the difference
   - Matches the bank transaction to both the original payment and the adjustment
   - Runs as a single atomic transaction — if any part fails, everything rolls back
4. The adjustment payment appears in the Payments List with a note explaining the variance

**Technical Details:**
- `fetchBatchSuggestedMatches`: GraphQL query that returns suggested matches for all unmatched transactions in one call
- `batchMatchExactTransactions`: GraphQL mutation that processes multiple exact matches atomically
- `quickAdjustAndMatch`: GraphQL mutation that creates adjustment payments and matches in a single database transaction
- All mutations use `externalManager` parameter for transactional atomicity — side effects (emails, notices, compliance updates) are deferred until the transaction commits

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

#### 8a: How Retention Works
When contracts include a retention percentage, the system automatically withholds that portion from each payment claim. These retained amounts are held in trust and tracked separately.

#### 8b: Tracking Retention
1. Navigate to **Retention List** (`/user/retention-list`) to see all retention amounts across all contracts
2. Each entry shows the contract, the amount withheld, and the current status (held or released)
3. Filter by project, contract, or status

#### 8c: Retention Claims
When contractual conditions for retention release are met (e.g., practical completion, defects liability period expiry):
1. Navigate to **Pay Apps** (`/user/claims`)
2. Click **"Add Claim"** and create a claim specifically for the retention release amount
3. The claim references the original contract and retention terms
4. Once approved, the retention payment is recorded and the retained amount is marked as released

#### 8d: Retention Trust Account (RTA) Compliance
1. If the project requires an RTA under the BIF Act, retention money must be held in a dedicated Retention Trust Account
2. The system monitors that retained funds are deposited into the correct RTA
3. Reconciliation of retention payments follows the same CSV upload and matching process described in Phase 5e
4. QBCC notices are generated for retention account events (opening, closing, part payment, nil return)
5. Compliance dashboard flags any RTA issues requiring action

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

*This document covers every user-accessible page and feature in the PayTrade platform as of the current codebase. Admin panel documentation is maintained separately in PayTrade-Admin-Guide.md. Plan features and pricing are dynamically managed by admins via the subscription management system and may change over time.*
