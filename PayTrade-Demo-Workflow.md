# PayTrade Full Workflow Demo

A step-by-step demonstration script covering every major area of the PayTrade platform. This guide is designed for live walkthroughs, investor presentations, client onboarding sessions, or internal training.

---

## Prerequisites

Before starting the demo, ensure:

- A demo company account exists on an **Advanced** or **Pro Audit** plan (required for Xero integration, ABA files, delegate authority, and audit features)
- At least one secondary user account exists for multi-user / invitation demos
- A sample Xero demo organisation is available and connected (see Section 10)
- Sample CSV bank statement file ready for upload
- Sample PDF documents ready for contract/claim attachment
- Access to the Admin Portal with an active admin account

---

## Demo Flow Overview

| # | Section | Duration | Key Features |
|---|---------|----------|--------------|
| 1 | Public Website & SEO | 5 min | Landing pages, pricing, how-to guides, topics |
| 2 | Registration & Onboarding | 5 min | Sign-up flow, email verification, business profile |
| 3 | Dashboard & Navigation | 3 min | Welcome dialog, to-do boxes, financial overview |
| 4 | Business & User Management | 5 min | Company profile, user access, invitations |
| 5 | Clients & Suppliers | 3 min | Add contacts, link to Xero |
| 6 | Projects & Contracts | 5 min | Eligibility checker, contract terms, variations |
| 7 | Trust Accounts & Banking | 5 min | PTA/RTA setup, ABA files, bank feeds |
| 8 | Payment Claims & Payments | 7 min | Claims lifecycle, S75 statements, reconciliation |
| 9 | Trust Accounting & Compliance | 5 min | Journals, ledger, trial balance, notices |
| 10 | **Xero Integration (Deep Dive)** | 10 min | OAuth, mapping, sync, webhooks, error resolution |
| 11 | Retention Management | 3 min | Retention tracking, RTA compliance, release claims |
| 12 | Community & AI Support | 5 min | Discussions, product ideas, AI assistant |
| 13 | Admin Portal | 7 min | User management, content, subscriptions, pricing table |
| 14 | Security & Settings | 3 min | Password management, activity log, subscriptions |

**Total estimated time: ~70 minutes** (can be shortened by skipping sections)

---

## 1. Public Website & SEO Landing Pages

**Goal:** Show the public-facing experience that drives organic traffic and conversions.

### Steps

1. **Home Page** (`/`)
   - Walk through the value proposition sections
   - Point out the industry-specific messaging for construction
   - Highlight the call-to-action buttons leading to sign-up

2. **Industry Landing Pages**
   - Visit `/headcontractors` — show tailored messaging for head contractors
   - Visit `/subcontractors` — show subcontractor-focused content
   - Visit `/accountants` — show professional services angle
   - Mention `/principals`, `/bookkeepers`, `/auditors`, `/legal-practitioners` are also available

3. **Pricing Page** (`/pricing`)
   - Toggle between monthly and yearly billing
   - Walk through the four plans: Basic (Free), Standard, Advanced, Pro Audit
   - Highlight key differentiators: Xero integration (Advanced+), Audit Export (Pro Audit only)
   - Note: This table is dynamically managed from the admin panel

4. **Content & Resources**
   - Visit `/how-to-guides` — browse step-by-step platform guides by category
   - Open one guide to show the detailed walkthrough format with screenshots
   - Visit `/blog` — show published articles and news
   - Visit `/articles` — show educational resource content

5. **SEO Topic Pages**
   - Visit `/topics/project-trust-accounts-queensland` (or any active topic slug)
   - Show auto-generated content with related topic interlinking
   - Mention these are admin-managed via the SEO Keywords editor

6. **Community (Public View)**
   - Visit `/community/discussions` — show publicly viewable Q&A threads
   - Visit `/community/product-ideas` — show the feature request board
   - Point out that posting requires authentication

7. **Support**
   - Visit `/support` — show the multi-step support flow
   - Demonstrate the search bar (searches FAQs, guides, community content)
   - Note: "Ask PayTrade AI" requires login (covered in Section 12)

---

## 2. Registration & Onboarding

**Goal:** Walk through the complete new user sign-up journey.

### Steps

1. **Sign Up** (`/user/login` — sign-up tab)
   - Enter email and password
   - Show password complexity requirements (8+ chars, uppercase, lowercase, number, special)
   - reCAPTCHA verification completes automatically

2. **Email Verification** (`/user/registration/verification`)
   - 6-digit OTP sent to email
   - Show the OTP entry screen and "Resend" option
   - Note: OTP expires after 20 minutes

3. **Personal Details** (`/user/registration/details`)
   - Enter first name, last name, phone number
   - Select occupation and position title from dropdowns
   - Address entry with Google Places autocomplete

4. **Profile Photo** (`/user/registration/profile-upload`)
   - Upload and crop a profile picture
   - Show the skip option

5. **Business Profile** (`/user/registration/business-profile`)
   - Enter company name, ABN, entity type
   - System searches for existing matching businesses
   - If match found: option to request joining the existing company
   - If no match: new company profile is created

6. **Tax Information** (`/user/registration/tax`)
   - Enter TFN and GST registration status

7. **Company Verification** (`/user/registration/company-verification`)
   - Upload supporting documents
   - Enter QBCC license number if applicable

8. **Profile Selection** (`/user/registration/select-profile`)
   - If invited to other companies, choose which profile to activate
   - Otherwise, proceed with the personal company

### What Happens Behind the Scenes
- UserDetails record created
- CompanyDetails record created (type: "Personal")
- Free subscription automatically assigned
- User granted PRIMARY_ADMIN role on their personal company
- JWT access token issued

---

## 3. Dashboard & Navigation

**Goal:** Orient the user around their home base.

### Steps

1. **Welcome Dialog**
   - On first login, the welcome dialog appears with how-to guide thumbnails
   - Click a guide thumbnail to open the full guide
   - Dismiss the dialog

2. **Dashboard Overview** (`/user/dashboard`)
   - Point out the personalised welcome message
   - Show **Quick Action Links**: Add Client, Add Project, Add Contract, Add Trust Account, Add Claim, Audit Accounts, QBCC Eligibility Checker, Reconciliation
   - Show **To-Do Boxes**: Payments To Do, Notices To Do, Compliance To Do (counts update in real time)
   - Show **Financial Overview**: Cash Accounts, PTA balances, RTA balances
   - Show **Unmatched Transactions** section
   - Show the Activity Log link

3. **Sidebar Navigation**
   - Walk through each sidebar section to orient the audience:
     - Dashboard, Projects, Contracts, Pay Apps, Bank Accounts, Trust Accounting
     - Compliance, Notices, Clients & Suppliers, Integrations
     - Community, Settings, Subscription

---

## 4. Business & Company Management

**Goal:** Show how businesses configure their company profile and manage team access.

### Steps

1. **Edit Business Profile** (`/user/edit-business-profile`)
   - Update company details: legal name, entity type, ABN, ACN
   - Show contact information fields with Google Places integration
   - Enter QBCC license numbers
   - Upload company logo
   - Show trust record tracking fields (training records, authorised signatories)

2. **User Access Management** (`/user/company/user-access`)
   - View all company users and their roles
   - Click **Add User** (`/user/company/user-access/add`) — show the invitation form
   - Edit a user's role (`/user/company/user-access/edit/[id]`) — show granular permission controls
   - Explain role hierarchy: PRIMARY_ADMIN > ADMIN > STANDARD USER > BASIC USER

3. **Invitations** (`/user/company/invitations`)
   - Show pending invitations list
   - Demonstrate sending a new invitation
   - Show revoke option

4. **Multi-Profile Switching** (`/user/select-profile`)
   - If the demo user belongs to multiple companies, show the profile switcher
   - Explain that each profile has independent role and permissions

---

## 5. Clients & Suppliers

**Goal:** Demonstrate contact management and Xero import capability.

### Steps

1. **Client & Supplier List** (`/user/clients-suppliers`)
   - Show the contacts list with search and filter options

2. **Add a Contact** (`/user/clients-suppliers/add`)
   - Create a new client or supplier record
   - Enter ABN, business registration details, contact information
   - Link to projects/contracts

3. **Xero Contact Import** (Advanced/Pro Audit plans)
   - Show the "Import from Xero" option
   - Preview: contacts are imported and auto-mapped when Xero integration is active (covered in detail in Section 10)

---

## 6. Projects & Contracts

**Goal:** Show project creation with the BIF Act eligibility checker and contract setup.

### Steps

1. **Create a Project** (`/user/projects/add`)
   - Enter project name, description, value, type
   - Set start and completion dates
   - Add principal details
   - Enter location using Google Places
   - **Eligibility Checker**: Enter contract value — system determines if a PTA is required under the BIF Act
   - Show plan limits: Basic/Standard = 1 project, Advanced = 10, Pro Audit = unlimited

2. **Project Overview** (`/user/projects/overview/[id]`)
   - Walk through the project dashboard: contracts, trust accounts, compliance status, payment claims, notices, financial summary

3. **Create a Contract** (`/user/contracts/add`)
   - Link to the project just created
   - Select the subcontractor/supplier
   - Enter contract sum, retention percentage, variation terms
   - Define payment schedule (claim frequency, due dates)
   - Show contract status tracking

4. **Contract Overview** (`/user/contracts/overview/[id]`)
   - Show linked items: project, bank accounts, claims, payments

5. **Variations** (`/user/variations/add`)
   - Create a variation against the contract
   - Show how it adjusts the contract total
   - Walk through the approval workflow

---

## 7. Trust Accounts & Banking

**Goal:** Demonstrate trust account setup, ABA file generation, and bank feeds.

### Steps

1. **Add a Trust Account** (`/user/bank-accounts/add`)
   - Select account type: **Project Trust Account (PTA)**
   - Link to the project
   - Enter bank details (BSB, account number, financial institution)
   - Show plan limits: Basic/Standard = 2, Advanced = 10, Pro Audit = unlimited

2. **Add a Retention Trust Account** (`/user/bank-accounts/add`)
   - Select account type: **Retention Trust Account (RTA)**
   - Explain the BIF Act requirement for holding retention money in a dedicated RTA

3. **Add a General Cash Account** (`/user/bank-accounts/add`)
   - Select account type: **General Cash Account**
   - Standard business operating account

4. **Account Overview** (`/user/bank-accounts/overview/[id]`)
   - Show the account dashboard: balance, recent transactions, linked projects

5. **Bank Statement** (`/user/bank-accounts/overview/bank-statement`)
   - View transaction history

6. **ABA File Generation** (Standard+ plans)
   - Generate an Australian Bankers Association (ABA) payment file for bulk payments
   - Show the download and format

7. **Bank Feeds** (Standard+ plans)
   - Show automated bank transaction imports via Open Banking (Adatree CDR integration)
   - Explain how this eliminates manual CSV uploads

---

## 8. Payment Claims & Payments

**Goal:** Walk through the full payment claim lifecycle, from submission to bank reconciliation.

### Steps

1. **Create a Payment Claim** (`/user/claims/add`)
   - Select the contract
   - Enter claim amount, description
   - Attach supporting documents (PDF upload)
   - Submit the claim — system generates a reference number
   - Show the two claim types:
     - **Receivable**: Claims you submit to receive payment (subcontractor role)
     - **Billable**: Claims submitted to you for payment (head contractor role)

2. **Review a Claim** (`/user/claims/view/[id]`)
   - Open a received billable claim
   - Review amounts and attached documents
   - Approve, partially approve, or dispute

3. **Record a Payment** (`/user/claims/payments/add`)
   - From the claim view, click "Add Payment"
   - Enter payment amount, date, payment reference
   - **S75 Supporting Statement** is generated automatically for trust account claims
   - Show the generated PDF

4. **Payments To Do** (`/user/payments-to-do`)
   - Show outstanding payments requiring action
   - Upcoming deadlines highlighted

5. **Payments List** (`/user/payments-list`)
   - Complete payment history with filters (status, date range, contract)
   - Show Export to Excel/PDF options

6. **Bank Transaction Reconciliation**
   - **Upload Transactions** (`/user/bank-accounts/update-transactions/[id]`)
     - Import a bank statement CSV file
     - System parses and imports each transaction row
   - **Match Transactions** (`/user/bank-accounts/match-transactions/[id]`)
     - System presents unmatched bank transactions alongside unmatched claims/payments
     - Match each bank transaction to its corresponding claim payment
     - Matched transactions update the trust account ledger and compliance status
   - **Unmatch Transactions** (`/user/bank-accounts/unmatch-transactions/[id]`)
     - Demonstrate reversing an incorrect match

---

## 9. Trust Accounting & Compliance

**Goal:** Show the full trust accounting suite and QBCC compliance monitoring.

### Steps

1. **Trust Accounting Dashboard** (`/user/trust-accounting`)
   - Overview of all trust accounts and their status

2. **Journal Entries** (`/user/trust-accounting/journals`)
   - Show automated entries created from payment claims and bank transactions
   - Explain double-entry bookkeeping principles applied to trust accounts

3. **Account Ledger** (`/user/trust-accounting/account-ledger`)
   - Detailed ledger for each trust account

4. **Trial Balance** (`/user/trust-accounting/trial`)
   - Generate a trial balance report for a selected period
   - Explain this is a BIF Act monthly requirement

5. **Deposits** (`/user/trust-accounting/deposits`)
   - Track and record trust account deposits

6. **Reconciliation** (`/user/trust-accounting/reconciliation-record/add`)
   - Create a monthly reconciliation record
   - Match trust account bank balance against the ledger
   - Explain this is mandatory under the BIF Act

7. **Audit Management** (Pro Audit only) (`/user/trust-accounting/audit`)
   - Create an audit record at `/user/trust-accounting/audit/add`
   - Record external audit details as required by QBCC regulations

8. **Compliance Dashboard** (`/user/compliances/overview`)
   - Show compliance status across all projects
   - Status Types: "Ok" (green) or "Action Required" (red)
   - Click into a specific compliance issue to see resolution guidance
   - Automated checks include: PTA/RTA establishment, beneficiaries, monthly reconciliation, notices, payment deadlines

9. **Notices** (`/user/notices`)
   - Show the list of QBCC statutory notices
   - Generate a notice at `/user/notices/add`:
     - **TA1**: Account opening notice
     - **TA2**: Account closing notice
     - **TA3**: Related entities notice
     - **TA4**: Part payment notice
     - **TA5**: Nil return notice
     - **S75**: Supporting statement
   - Show the generated PDF
   - Show email delivery to relevant parties
   - Note: Basic plan = manual only; Standard+ = automated generation from compliance triggers

---

## 10. Xero Integration (Detailed Walkthrough)

**Goal:** Demonstrate the complete Xero integration lifecycle — from initial connection through to bidirectional sync, error handling, and automated workflows.

**Plan Requirement:** Advanced or Pro Audit subscription required.

### 10.1 Connecting to Xero

1. **Navigate to Integrations** (`/user/integrations`)
   - Show the Integration List page
   - Point out the available integration cards (Xero is the primary one)
   - Note the subscription check — system verifies Advanced or Pro Audit plan before allowing connection

2. **Initiate OAuth2 Connection**
   - Click **"Connect"** on the Xero integration card
   - User is redirected to Xero's authorisation page
   - Log in to Xero (use the demo organisation)
   - Grant consent for PayTrade to access the Xero organisation
   - Xero redirects back to PayTrade via `/xero/callback` with an auth code

3. **Connection Confirmed**
   - Return to the Integration List — Xero now shows as **Connected**
   - Show the available actions: **Disconnect**, **Pause**, **Delete**
   - Explain token storage: access and refresh tokens stored securely in `XeroIntegrationDetails`
   - Explain automatic token refresh: a background job runs every 23 hours to refresh tokens before expiry
   - If a user revokes access in Xero, the system detects the failure and prompts re-authorisation

### 10.2 Xero Onboarding Wizard

1. **Navigate to Xero Dashboard** (`/user/integrations/xero`)
   - Show the 6-step onboarding wizard
   - Point out the sync statistics panel (Synced vs. Pending counts)
   - Show the sync log table at the bottom

2. **Step 1: Settings / Mapping** (`/user/integrations/xero/settings`)

   **Chart of Account Mappings:**
   - Map PayTrade financial activities to Xero account codes:
     | Setting | Purpose |
     |---------|---------|
     | Invoice Code | Revenue account for synced receivable invoices |
     | Bill Code | Expense account for synced payable bills |
     | Retention Payable Retained Code | Account for retention amounts held (payable) |
     | Retention Payable Release Code | Account for retention amounts released (payable) |
     | Retention Receivable Retained Code | Account for retention amounts held (receivable) |
     | Retention Receivable Release Code | Account for retention amounts released (receivable) |
     | Liability Payable Code | Account for payable liabilities (defects period) |
     | Liability Receivable Code | Account for receivable liabilities (defects period) |
   - Demonstrate creating a **new Xero account** directly from the settings screen (Account Type, Code, Name)

   **Tax Rate Configuration:**
   - Set the Invoice Tax Code (default tax rate for invoices synced to Xero)
   - Set the Bill Tax Code (default tax rate for bills synced to Xero)
   - Show how to create a new tax rate with custom components, compound tax support, and report tax type (Input, Output, None, Exempt)

   **Tracking Categories:**
   - Set the **Project Tracking Category** — a Xero tracking category that represents PayTrade "Projects"
   - Set the **Contract Tracking Category** — a Xero tracking category that represents PayTrade "Contracts"
   - Point out: the system prevents using the same tracking category for both
   - Show creating a new tracking category directly from Settings

   **Sync Preferences (Draft vs. Approved):**
   | Direction | Setting | Options |
   |-----------|---------|---------|
   | PayTrade to Xero | Invoice sync status | Draft or Approved |
   | PayTrade to Xero | Bill sync status | Draft or Approved |
   | PayTrade to Xero | Payment sync status | Draft or Approved |
   | Xero to PayTrade | Invoice sync status | Draft or Approved |
   | Xero to PayTrade | Bill sync status | Draft or Approved |
   | Xero to PayTrade | Payment sync status | Draft or Approved |

   **Other Settings:**
   - Reference Format: customise the reference prefix for synced documents
   - Webhook Wait Time: set delay (0-60 minutes) for background sync processing

3. **Step 2: Bank Account Mapping** (`/user/integrations/xero/bankAccounts`)
   - Show three tabs: **PayTrade Accounts**, **Xero Accounts**, **Mapped**
   - **Auto Map**: Click "AUTO MAP" on the Mapped tab — system automatically matches by name
   - **Manual Map**: Select the corresponding Xero account from a searchable dropdown
   - **Sync to Xero**: Create a new bank account in Xero from a PayTrade account
   - **Sync to PayTrade**: Create a new PayTrade account from a Xero bank account
   - **Unmap**: Break an existing link to allow re-mapping
   - Explain: linking trust accounts (PTA/RTA) is critical for correct invoice/bill sync

4. **Step 3: Contact Mapping** (`/user/integrations/xero/contacts`)
   - Same three-tab pattern: PayTrade Contacts, Xero Contacts, Mapped
   - Show Auto Map, Manual Map, Sync to Xero, Sync to PayTrade, Unmap
   - Explain: contacts must be mapped before invoices/bills referencing them can sync
   - Show importing contacts from Xero into PayTrade

5. **Step 4: Project Tracking Category Mapping** (`/user/integrations/xero/projects`)
   - Maps PayTrade projects to Xero Tracking Category Options
   - These are not separate Xero entities — they are options within the tracking category selected in Settings
   - Show the mapping process

6. **Step 5: Contract Tracking Category Mapping** (`/user/integrations/xero/contracts`)
   - Same approach as projects — maps PayTrade contracts to Xero Tracking Category Options
   - Show the mapping process

7. **Step 6: Activate**
   - Set the integration to **Active** status
   - The Xero dashboard now shows live sync statistics

### 10.3 Invoice & Bill Synchronisation

1. **Export a PayTrade Claim to Xero (PayTrade to Xero)**
   - Navigate to Pay Apps (`/user/claims`)
   - Select a claim with status "Draft" or "Confirmed"
   - Click **"Sync to Xero"**
   - Show the pre-checks the system performs:
     - Client/supplier is mapped to a Xero contact
     - Project is mapped to a Xero tracking category option
     - Contract is mapped to a Xero tracking category option
     - Required Xero account codes are configured
     - Tax codes are set
   - System constructs the payload:
     - Determines type: ACCREC (Receivable/Invoice) or ACCPAY (Payable/Bill)
     - Maps dates, reference numbers, GST settings, line items
     - If retention applies: splits amounts across multiple line items using dedicated retention account codes
   - Invoice/bill created in Xero as Draft or Approved (based on sync preferences)
   - Show the resulting Xero Invoice ID saved in PayTrade

2. **Import a Xero Invoice to PayTrade (Xero to PayTrade)**
   - Navigate to Xero Invoices (`/user/integrations/xero/invoices`)
   - Show unsynced Xero invoices
   - Click **"Sync to PayTrade"**
   - System validates:
     - At least one line item
     - Valid tracking categories (Project/Contract)
     - Account codes and tax codes match configuration
     - Total does not exceed contract size
   - Back-calculates retention from specialised line items
   - Creates a payment claim in PayTrade
   - Status set based on sync preferences

3. **View Synced Invoices** (`/user/integrations/xero/invoices`)
   - Show the list of synced invoices with status indicators

4. **View Synced Bills** (`/user/integrations/xero/bills`)
   - Show the list of synced bills

5. **Payment Synchronisation**
   - Show payments applied to invoices/bills syncing between systems
   - Supports overpayments and credit notes
   - Follows the same Draft/Approved preference

### 10.4 Automated Sync & Webhooks

1. **Daily Cron Job**
   - Explain: runs at 1:00 PM UTC daily
   - Iterates through all active integrations
   - Performs a full refresh cycle: accounts, contacts, projects, contracts, invoices

2. **Xero Webhooks**
   - Explain: PayTrade receives real-time events from Xero at `/xero-webhook`
   - Supported events:
     - `CONTACT.CREATE` — new contact added in Xero
     - `CONTACT.UPDATE` — contact modified in Xero
     - `INVOICE.CREATE` — new invoice created in Xero
     - `INVOICE.UPDATE` — invoice modified in Xero
   - Events are queued via Redis/BullMQ for reliable processing
   - Configurable wait time delays processing to batch rapid changes

### 10.5 Sync Logs & Error Resolution

1. **Sync Log Dashboard** (`/user/integrations/xero`)
   - Show the sync log table at the bottom of the Xero Dashboard
   - Each log shows: sync type, status (Succeeded/Failed), timestamp

2. **Sync Log Details** (`/user/integrations/xero/syncLogDetails/[id]`)
   - Click into a log entry to see:
     - **Visual Comparison**: side-by-side table comparing PayTrade fields vs. Xero fields
     - **Status Indicators**: each field marked "Ok" (green) or "Failed" (red)
     - **Request/Response**: actual API payload and error messages

3. **Error Resolution Flow** (demonstrate with a deliberately failed sync)
   - Click **"Resolve"** on a failed sync log
   - Show the four resolution paths:

   | Resolution Type | Trigger | Action |
   |-----------------|---------|--------|
   | **Automatic** | Missing entity in Xero or PayTrade | System creates it automatically, then retries |
   | **Redirect** | Missing required fields or invalid account codes | Redirects to the edit page or Xero Settings |
   | **Manual Mapping** | Unmapped entity (bank account, contact, project, contract) | Opens searchable dropdown modal, then retries |
   | **Special Cases** | Overpayments, document requirements, missing descriptions | Prompts for the specific missing data |

4. **Re-authentication Flow**
   - Explain: if a refresh token fails (e.g., user revoked access in Xero), the system returns `XERO_REFRESH` status
   - User is automatically redirected to re-authorise with Xero
   - After re-authorisation, sync resumes

### 10.6 Integration Management Actions

1. **Pause Integration**
   - From the Integration List, click **"Pause"** on Xero
   - All syncing stops; existing mappings are preserved
   - Click **"Unpause"** to resume

2. **Disconnect Integration**
   - Click **"Disconnect"** — tokens are invalidated, integration moves to Archived
   - Mappings are retained so re-connecting is faster

3. **View Archived Integrations** (`/user/integrations/archived`)
   - Show previously disconnected integrations

---

## 11. Retention Management

**Goal:** Show how retention is tracked and released through the system.

### Steps

1. **How Retention Works**
   - When contracts include a retention percentage, the system automatically withholds that portion from each payment claim
   - Retained amounts are held in trust and tracked separately

2. **Retention List** (`/user/retention-list`)
   - View all retention amounts across all contracts
   - Each entry shows: contract, amount withheld, status (held or released)
   - Filter by project, contract, or status

3. **Retention Claims**
   - When contractual conditions are met (practical completion, defects liability period expiry):
   - Navigate to Pay Apps and create a claim specifically for the retention release amount
   - Once approved, the retention payment is recorded and the retained amount is marked as released

4. **RTA Compliance**
   - Show the system monitoring that retained funds are deposited into the correct Retention Trust Account
   - Reconciliation follows the same CSV upload and matching process
   - QBCC notices generated for RTA events (opening, closing, part payment, nil return)
   - Compliance dashboard flags any RTA issues

---

## 12. Community & AI Support

**Goal:** Show community engagement features and the AI-powered support assistant.

### Steps

1. **Community Discussions** (`/community/discussions`)
   - Browse existing discussions by category
   - Open a discussion thread — show questions and answers
   - Point out the **Best Answer** system (answer with most likes is highlighted)

2. **Start a Discussion** (`/community/start-discussion`)
   - Create a new discussion question
   - Select category, add tags

3. **Product Ideas** (`/community/product-ideas`)
   - Browse feature requests
   - Show the voting system (upvote to signal demand)
   - Submit a new product idea at `/community/create-product-idea`

4. **Community Interactions**
   - Like a discussion or answer
   - Comment on a product idea
   - Flag/report inappropriate content (Inappropriate or Spam reason)

5. **AI Support Assistant** (`/support`)
   - **Step 1**: Type a question in the search bar — system searches FAQs, how-to guides, community discussions, and community answers
   - **Step 2**: Click "Ask PayTrade AI" to get an AI-generated answer
   - Show the AI response powered by GPT-4o using PayTrade's system guide as context
   - Point out: the AI answer is automatically posted to the community for others to benefit
   - **Step 3**: "Still need help?" links to the contact support form
   - Explain rate limiting: Free tier = 2 questions/hour, Paid tier = 20 questions/day
   - Explain safeguards: off-topic question detection, duplicate detection, prompt injection protection
   - For complex legal/regulatory questions, the AI uses web search to fetch current BIF Act and QBCC data

6. **Community Bot** (Admin feature)
   - Explain: AI bot generates realistic Q&A content using GPT-4o
   - Bot users have Australian construction industry personas
   - Scheduled Mon/Wed/Fri at 9 AM UTC
   - Can be manually triggered from the admin panel

---

## 13. Admin Portal

**Goal:** Show the full administrative capabilities of the platform.

### Steps

1. **Admin Login** (`/admin/login`)
   - Log in with admin credentials
   - Note: admin accounts are separate from platform user accounts

2. **Admin Dashboard** (`/admin/dashboard`)
   - Show dashboard widgets: New Users, New Businesses, Notices Pending, Compliance Issues, Failed Subscription Transactions, Trust Accounting Issues
   - Holiday table monitoring banner (warns when holiday coverage < 90 days)

3. **User Management** (`/admin/users`)
   - Search and filter all platform users
   - Edit a user: update details, block/unblock, mark as contacted
   - Reset password (generates random password and emails it)
   - **Login as User** (Super Admin only) — log into a user's account for support
   - Enable/disable free premium access
   - Generate Bot Users (creates AI-generated personas)

4. **Business Management** (`/admin/business`)
   - List all business profiles
   - Edit business details and verification status

5. **Admin Users** (`/admin/admin-users`)
   - Manage internal admin accounts
   - Groups & Permissions at `/admin/groups` — granular module-level permissions (View, Insert, Update, Delete, Print, Export)

6. **Content Management**
   - **FAQ** (`/admin/content-management/faq`) — manage FAQ entries
   - **Email Templates** (`/admin/content-management/email`) — view/edit system email templates
   - **Blog** (`/admin/blog`) — manage blog posts
   - **Resources** (`/admin/resource`) — manage educational resources
   - **How-to Guides** (`/admin/how-to-guides`) — manage step-by-step guides with Export/Import JSON
   - **SEO Keywords** (`/admin/seo-keywords`) — manage dynamic topic pages with Export/Import JSON

7. **Admin Guides** (`/admin/admin-guides`)
   - View admin-only how-to guides (filtered to "Admin Panel" category)
   - Internal documentation for admin processes

8. **Subscription Management** (`/admin/subscriptions/current`)
   - View and edit subscription plans
   - Plan items management at `/admin/subscriptions/manage-items/current`
   - Coupon management at `/admin/subscriptions/manage-coupons/current`
   - Subscription profiles and billing history

9. **Pricing Table Editor** (`/admin/subscriptions/pricing-table`)
   - Full CRUD management of the public pricing comparison table
   - Inline editing of feature rows
   - Add/delete rows, drag to reorder
   - Preset value helpers: "true" = checkmark, "false" = cross, text = displayed as-is
   - Preview mode to see changes before saving
   - Changes reflect on the public `/pricing` page in real time

10. **Community Management** (`/admin/community/discussions`)
    - Moderate discussions and product ideas
    - Review and act on reported content
    - Generate Bot Questions and Bot Answers

11. **Notices & Compliance (Admin View)**
    - View all notices across all users at `/admin/notices/current`
    - Platform-wide compliance dashboard at `/admin/compliances`

12. **System Configuration**
    - **Masters** (`/admin/masters`) — global dropdown values and constants
    - **Currencies** (`/admin/currency`) — supported currencies
    - **Financial Institutions** (`/admin/financial-institution`) — bank details
    - **Holidays** (`/admin/holidays`) — public holidays affecting payment deadlines
    - **Delegation** (`/admin/delegation`) — QBCC regulatory delegation settings

13. **Communication** (`/admin/communication`)
    - Create and send system-wide emails to users

14. **Admin Menus Editor** (`/admin/admin-menus`)
    - Full CRUD management of sidebar menu items
    - Add, edit, reorder, delete menus and manage sub-menus inline

---

## 14. Security & Settings

**Goal:** Show user security features and account management.

### Steps

1. **Personal Information** (`/user/personal-info`)
   - Update name, phone, address, profile photo, occupation

2. **Sign-in & Security** (`/user/sign-in-security`)
   - Change password (current password required)
   - Password complexity enforced

3. **Activity Log** (`/user/activity-log`)
   - Complete audit trail of all user actions
   - Filter by date range, action type
   - Track login/logout events, data changes, document generation

4. **Subscription Management** (`/user/manage-subscriptions/upgrade-plan`)
   - View current plan details
   - Compare plan features side by side
   - Upgrade to a higher tier via Stripe checkout
   - View billing history and invoices

---

## Demo Closing Summary

### Key Value Propositions to Reinforce

1. **BIF Act Compliance Made Simple** — Automated trust account management, notices, and compliance monitoring eliminate manual tracking
2. **End-to-End Financial Workflow** — From project creation through to bank reconciliation in one platform
3. **Xero Integration** — Bidirectional sync keeps accounting records aligned without double entry
4. **Scalable Plans** — From free individual accounts to enterprise Pro Audit with unlimited everything
5. **AI-Powered Support** — Instant answers to complex trust accounting and BIF Act questions
6. **Community Knowledge Base** — Shared learning from the construction industry
7. **7-Year Record Retention** — Statutory compliance period covered automatically
8. **Audit-Ready** — Pro Audit plan provides complete audit trail and export capabilities

### Suggested Follow-Up Questions for the Audience
- "Which subscription plan best fits your current project portfolio?"
- "How many trust accounts do you currently manage?"
- "Are you currently using Xero for your accounting?"
- "What compliance challenges are you facing with the BIF Act?"
- "Would you like to see the system configured for your specific business scenario?"
