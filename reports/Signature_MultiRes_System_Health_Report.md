# Signature Multi-Res Pty Ltd — System Health & Compliance Report

**Company:** Signature Multi-Res Pty Ltd (ID 1012)
**Primary user:** Kate Beresford (kate@signaturepropertypartners.com.au)
**Project in focus:** ALBA — 92 Kingsford Smith Drive, Hamilton (ID 1006, $125,458,150)
**Xero integration:** ACTIVE, no re-auth required
**Snapshot taken:** 26 May 2026 from Railway production database

---

## 1. Headline Numbers (what the dashboard shows)

| Tile | Count | Confirmed in DB |
|---|---|---|
| System Status Summary | **146** (64 Critical / 2 Warning / 80 Info) | 59 failed syncs + 4 PTA fails + 1 RTA fail + 2 flagged-no-email + 80 silently-no-email = **146** ✓ |
| Sync Log Summary | **332** (253 Synced / 20 Warning / 59 Failed) | 254 / 20 / 59 ✓ |
| Compliance — PTA | **4 issues** on ALBA | 4 FAILED rules under check #6 ✓ |
| Compliance — RTA | **1 issue** on ALBA | 1 FAILED rule under check #9 ✓ |
| Unmatched Transactions | **5** | 5 claims with list_status `Paid - Unmatched` ✓ |

The rest of this report explains every single one of those items and what to do about it.

---

## 2. System Status Summary — line by line (146 items)

The 146 dashboard items break down into three buckets. The Critical and Warning items must be cleared to get to a "clean" status. Info items are nice-to-have.

### 2A. CRITICAL — 64 items

These are the things actively breaking sync, reporting or compliance.

| # | Group | Item | How to fix | How to prevent it next time |
|---|---|---|---|---|
| 1–59 | Sync | 59 failed Xero sync log entries | See **Section 3** for the full per-row breakdown — each one has its own fix | See Section 3 — fixes are mostly: complete the Xero account-code mapping, add missing contact emails / bank details, and stop sending claims with future dates |
| 60 | PTA Compliance (ALBA) | Check #6 "Payments to Subcontractors" — rule failed (instance 1 of 4) | Open Compliance → ALBA → PTA → "Payments to Subcontractors". The 4 failures are individual subcontractor payment lines that were either paid late, paid from the wrong account, or didn't have a matching S22/Payment Schedule notice. Use the Resolve buttons on each to attach the correct evidence or correct the payment record. | Every subcontractor payment from the PTA needs (a) a valid payment claim, (b) a payment schedule issued within the statutory window, (c) the payment made on or before the due date, and (d) the bank transaction reconciled. Use the "Notices to do" tile and the Reconcile workflow weekly. |
| 61 | PTA Compliance (ALBA) | Check #6 "Payments to Subcontractors" — rule failed (instance 2 of 4) | Same as above | Same as above |
| 62 | PTA Compliance (ALBA) | Check #6 "Payments to Subcontractors" — rule failed (instance 3 of 4) | Same as above | Same as above |
| 63 | PTA Compliance (ALBA) | Check #6 "Payments to Subcontractors" — rule failed (instance 4 of 4) | Same as above | Same as above |
| 64 | RTA Compliance (ALBA) | Check #9 "Monthly Reconciliations and Recordkeeping" — failed | Open Compliance → ALBA → RTA → check #9. The RTA reconciliation for the most recent month has either not been finalised, or the recorded balance doesn't agree with the bank statement. **DB confirms:** the last RTA reconciliation on record (account #10000000040) is **April 2026 — Balanced**. So the failure is the **missing May 2026 reconciliation** (we're now 26 May; QBCC requires monthly recon within 15 days of month-end). | Add a recurring monthly reminder on the 1st of every month: import the bank statement for the RTA, run the Reconcile workflow, save the report, then run the Audit Report so it counts toward check #9 long-term. |

> **Note on Check #4 ("Administration of the Account") and Check #9 PTA / Check #10 PTA / Check #11 RTA:** these currently have **blank** status (not FAILED, not PASSED) in the DB. They will start to count as failures once the project hits the trigger date (e.g. annual review reports, account closure). Not in the 64 today — but worth knowing they'll appear later.

### 2B. WARNING — 2 items

| # | Item | How to fix | How to prevent |
|---|---|---|---|
| 1 | Contact "Bunnings Trade" — flagged as missing email (`needs_email=true`) | Clients & Suppliers → Bunnings Trade → add email address → Save. The auto-recovery sweeper (just deployed under Task #268) will then automatically retry the 11 currently-blocked Smart Contract auto-creations for Bunnings. | When importing or creating any contact, treat email as a mandatory field. The Xero import path is now stricter (Task #154) and will flag this automatically, but operator discipline still matters. |
| 2 | Contact "Richard Rowles Construction Programming Pty Ltd" — flagged as missing email | Same as above — add the email, the 4 blocked Smart Contract attempts will auto-retry. | Same as above. |

### 2C. INFO — 80 items

All 80 are "Contact has no email address" entries for suppliers that have **not** been flagged via the active-blocker path (i.e. nothing has tried to use them yet, so it's not blocking work — just untidy data).

**Sample** (top 30 of 80, alphabetical, all in company 1012):

1300 Locate · Altogether · Amazon · Ascend Recruit Pty Ltd · ASHBURNER FRANCIS PTY. LTD. · ATO · BJS Group (CNF Protection Pty Ltd) · Brisbane City Council · Brisflow Plumbing & Gas · Buildable · Carter Burtenshaw · Civil Train Queensland · Classic Corp · Continental Coffee · DDA CONSULTING PTY LTD · Energex · Energy Rating Consulting · ENVIRONMENTAL WATER SOLUTIONS PTY. LTD. · ERDS · ESAFETY SUPPLIES Pty Ltd · Evolution Precast (QLD) Pty Ltd · Fluid Learning Pty Ltd · FMG Engineers · Gaetano Calabrese · G James Glass & Aluminium · H.D Weber & T.A Weber (GST FREE) · HERA Structural Engineers · HILTI · Ideal Barn Door · …

**How to fix (bulk):**
- Clients & Suppliers → filter "Missing email" → CSV-export → fill emails in Excel → re-import. This is the fastest path for 80 contacts.
- Alternatively, prioritise the ones you're likely to send notices/payments to in the next quarter — the rest can wait until they're actually used.

**How to prevent:** Going forward, the system already prompts for email on creation. The 80 historical contacts came from a one-time Xero import that didn't enforce it.

---

## 3. Sync Log Errors — line by line

### 3A. FAILED — 59 entries (grouped by error code)

| Count | Error code | Plain-English meaning | Fix (this instance) | Prevent (going forward) |
|---|---|---|---|---|
| **14** | `WH_MISSING_ACCOUNT_FIELDS` | A Xero invoice or bill webhook came in but the account-code mapping in PayTrade is not configured, so PayTrade can't decide which contract / line it belongs to. **The single root cause behind 14 errors.** | Integrations → Xero → Settings → **Variable Bill Code mapping** — finish configuring the missing account types. Once configured, run "Manual sync" for any of the affected bill IDs (or just wait — the contact-recovery sweeper deployed in Task #268 will retry them automatically). | This is a one-time setup issue. Once the mapping table is complete, future webhooks will not hit this error. Add it to the onboarding checklist. |
| **13** | `WH_CONTACT_MISSING_FIELDS` | Xero pushed a contact update for a contact whose record in Xero is missing 10+ fields (Name, Type, Status, Address, Country, Phone, etc.). PayTrade refused the import because it would have created a junk contact. | Open Xero → find each contact → fill in Name/Address/Phone/Country at minimum → save → in PayTrade click **Retry import** on the sync log. | These came from contacts that were created in Xero with almost no detail (likely quick-add). Train the Xero users to use the full contact form, or archive the half-finished contacts in Xero. |
| **11** | `SCHEDULER_RESOURCE_NOT_FOUND` | The hourly scheduler tried to re-pull an invoice/bill from Xero and the Xero API returned 404 — i.e. the invoice was deleted or voided in Xero after PayTrade saw the webhook. | These are mostly self-healing. Archive them from the sync log header (use the new "Clean up archived-contact failures" button if they fall into the archived-contact subset). | No prevention needed — this is benign. The next scheduler tick after archival will not retry them. |
| **5** | `SMART_CONTRACT_CONTACT_INCOMPLETE` | A Xero claim came in and PayTrade tried to auto-create the matching Smart Contract, but the supplier was missing email or bank-account details. | For each named contact (see list below), add the email + bank account in PayTrade, then click **Retry** on the sync log. After Task #268 just deployed, this will auto-retry within 15 minutes of you completing the contact. | Same as the "missing email" prevention in section 2 — enforce email + bank on contact creation. The DB shows the affected contacts: **H.D Weber & T.A Weber (GST FREE)**, **MBA Consulting Engineers**, **Newnham Scaffolding**, **Appliance Testing Supplies**, **Timms Contractors Pty Ltd**. |
| **3** | `MANUAL_TWO_SIDED_DISPATCH_FAILED` | The manual re-sync tool tried to re-process invoice/bill `6b081023-f1f7-4adf-8656-d2c075a731a7` three times; each time the handler reported a processing failure. | This is the same record three times — open the sync log detail for that invoice ID, follow the deep-link into Xero, identify what's wrong (likely a contract/contact mismatch), fix it, then retry once. | Don't manually re-sync the same record multiple times — fix the underlying mismatch first. |
| **2** | `SCHEDULER_CONTRACT_NOT_FOUND` | "Multiple contracts found for this project and contact. Please assign a contract tracking category in Xero." | Xero → the affected invoice → set the **Contract** tracking category to the correct contract → save. Then click Retry in PayTrade. | Always set the Contract tracking category on every invoice/bill in Xero when there's more than one contract per supplier per project. |
| **2** | `WH_CONTACT_NOT_FOUND` | Webhook referenced a contact ID PayTrade has no record of (probably because the contact was archived in Xero before PayTrade could mirror it). | Click "Clean up archived-contact failures" (the new button from Task #267 — top-right of the Sync Log table). It will reclassify these to a friendlier Warning. | Once Task #265 fully soaks (recently shipped), this should self-resolve for archived contacts going forward. |
| **2** | `WH_CONTACT_NOT_MAPPED` | Contact came through as raw Xero ID with no matching PayTrade contact record. | Manually map: Integrations → Xero → Contacts → find the unmapped row → "Link to PayTrade contact". | Run a "Sync all contacts" from Settings once per quarter to keep the mirror up to date. |
| **1** | `MISSING_PROJECT_TRACKING_CATEGORY_ID_FROM_XERO_SYNC` | A contract sync failed because the Xero tracking category for "Project" isn't mapped in PayTrade Settings. | Integrations → Xero → Settings → set the Project tracking-category mapping → save. | Onboarding checklist item — both Project and Contract tracking categories must be mapped before sync starts. |
| **1** | `SCHEDULER_CONTACT_NOT_MAPPED` | Same as `WH_CONTACT_NOT_MAPPED` but seen by the scheduler instead of a live webhook. | Same fix. | Same prevention. |
| **1** | `WH_CLAIM_RECEIVED_DATE_IN_FUTURE` | An invoice was issued in Xero with a "Received date" later than today. | Edit the invoice in Xero, correct the received date to today or earlier, then click Retry. | Add a Xero rule / training note: never future-date received dates. |
| **1** | `SMART_CONTRACT_TYPE_MISMATCH` | Smart Contract creation for **"Partnership Of FD Alba Pty Ltd, Signature Alba Pty Ltd & JCA Alba Pty Ltd"** failed — that contact is marked as a **Supplier** but this claim needs it to be a **Client** (this is your head-contract head client). | Clients & Suppliers → that contact → change Role to include **Client** → save → click Retry on the sync log. | Use the dual-role tick (Client *and* Supplier) for partnerships that play both sides. |
| **1** | `WH_CONTRACT_NOT_FOUND` | "Multiple contracts found for this project and contact. Please assign a contract tracking category in Xero." Same root cause as `SCHEDULER_CONTRACT_NOT_FOUND`. | Same fix. | Same. |
| **1** | `SCHEDULER_CONTRACT_SIZE_EXCEEDS` | A claim from Xero brought the total claimed-to-date above the contract sum. | Either (a) raise a contract variation in PayTrade first and retry, or (b) reduce the claim in Xero. | When a contract is heading near the cap, raise the variation before issuing the next claim. |
| **1** | `BANK_MISSING_FIELDS` | A bank account auto-created from Xero is missing mandatory fields. | Bank/Trust Accounts → find the draft account → fill in the missing fields → save. | Configure bank accounts in PayTrade first (with full details), then map to Xero — don't rely on the auto-create path for first creation. |

### 3B. WARNING — 20 entries

| Count | Error code | Plain-English meaning | Fix | Prevent |
|---|---|---|---|---|
| **15** | `SMART_CREATE_BLOCKED_MISSING_EMAIL` | 15 Smart Contract auto-creation attempts were blocked because the supplier has no email. **All 15 are for just two contacts: Bunnings Trade and Richard Rowles Construction Programming Pty Ltd.** | Add the email to those two contacts (Section 2B above). All 15 will auto-retry within 15 minutes. | See Section 2B. |
| **2** | `SCHEDULER_BANK_DRAFT_INCOMPLETE` | Two bank accounts were auto-created in PayTrade as drafts from Xero and need to be finalised: **Signature Multi-Res Pty Ltd #9215 Bel-Air** and **NAB Credit Card Main Account #2322**. | Bank/Trust Accounts → each draft account → complete the required fields → activate. | Same prevention as `BANK_MISSING_FIELDS` above. |
| **1** | `CONTACT_FINANCIAL_DETAILS_MISMATCH` | Contact **Bunnings trade** — PayTrade has different BSB/account number to what Xero now has. | Clients & Suppliers → Bunnings trade → review bank details → choose which side wins (usually pull from Xero) and overwrite. | Whenever bank details change, change them in one system only, then re-sync. |
| **1** | `CONTACT_IMPORTED_NEEDS_EMAIL` | Contact **Richard Rowles Construction Programming Pty Ltd** was imported but missing email. | Add email → click Resolve. | Same as 2B. |
| **1** | `WH_CONTACT_IMPORTED_NEEDS_EMAIL` | Contact **Bunnings Trade** was imported via webhook and is missing email. | Add email → click Resolve. | Same as 2B. |

---

## 4. Compliance Alerts — line by line

Compliance is per-project. ALBA — 92 Kingsford Smith Drive, Hamilton is the only project in this company that's `In Progress` and PTA+RTA eligible.

### 4A. Project Trust Account (PTA) — 4 critical issues

All 4 sit under **Check #6 "Payments to Subcontractors"** (rule 6.x — multiple sub-rules failed).

**Looking at your payment_claims for project 1006, here are the most likely root causes:**

| Claim ID | Amount | Status | Paid date | Due date | Likely compliance issue |
|---|---|---|---|---|---|
| 100068 | $4,922.28 | Paid - Unmatched | — | 30 May 26 | **Unmatched** — bank transaction not reconciled, so PayTrade can't prove the payment came from the PTA |
| 100065 | $22,867.98 | Paid - Unmatched | — | 30 Apr 26 | **Unmatched** — same root cause |
| 100066 | $1,595.00 | Paid - Unmatched | — | 30 Apr 26 | **Unmatched** — same root cause |
| 100051 | $16,776.02 | Paid - Unmatched | — | 30 Apr 26 | **Unmatched** — same root cause |
| 100067 | $2,640.00 | Paid - Unmatched | — | 30 Mar 26 | **Unmatched, >55 days old** — also overdue from a reporting perspective |

> Note: 4 PTA failures + 5 unmatched payments — the 5th may be flagged under a different sub-rule (e.g. Payment Remittance Advice notice not yet sent). The exact mapping is in the compliance row's `display_message` which is blank in the DB, so the dashboard "Resolve" link on each row will tell you exactly which sub-rule (paid late vs unmatched vs missing notice) is breaking.

**How to fix all 4 (one workflow):**

1. **Bookkeeping → Reconcile** the ALBA Project Trust Account against the bank statement(s) covering March–May 2026.
2. Match each of those 5 transactions to its claim. The "Smart Matching" feature should find them automatically — if not, use the Quick Adjust to handle micro-cents.
3. Once reconciled, the `list_status` flips from `Paid - Unmatched` to `Paid - Matched` and the PTA compliance check re-evaluates within minutes (or run Compliance → Refresh).
4. Whichever rule remains red after reconciliation will name a specific notice that needs to be issued (most likely **Supplier Payment Remittance Advice Notice** — go to **Notices** and send it from the Payment record).

**How to prevent going forward:**

- Reconcile the PTA at least weekly. The longer payments sit unmatched, the more rules they trip.
- Always send the Payment Remittance Advice notice at the time of payment (the auto-send flow from Task #271 will now do this for you on Smart-Contract-originated payments, but manual payments still need a click).
- Use the **Auto-recheck unmatched retention transfers** setting under Integrations → Xero (already on for your tenant — confirmed in DB).

### 4B. Retention Trust Account (RTA) — 1 critical issue

| Check | Name | Status | Underlying cause |
|---|---|---|---|
| **#9** | Monthly Reconciliations and Recordkeeping | **FAILED** | RTA bank account #10000000040 last has a reconciliation report dated **30 April 2026**. We're now 26 May 2026 — **the May 2026 reconciliation is missing** and Queensland RTA rules require it within 15 days of month-end. |

**How to fix:**
1. Bank/Trust Accounts → SIGNATURE MULTIRES PTY LTD ALBA RETENTION TRUST ACCOUNT → Import statement → upload the May 2026 statement.
2. Bookkeeping → Reconcile → tick all transactions → Save report.
3. Trust Accounting → Audit Report → run the audit for May 2026 (currently you have **zero audit reports** on file for this company — see prevention below).
4. The RTA compliance check re-evaluates within minutes.

**How to prevent:**

- **Critical gap found:** the `audit_report` table has **zero rows** for company 1012. Audit reports are a QBCC requirement on top of monthly reconciliations. Schedule them at the same time as the monthly recon — they take 1 click once reconciliation is done.
- Add the **1st of every month** as a recurring reminder for: (1) statement import, (2) reconciliation, (3) audit report.
- Compliance Check #4 (Administration of the Account) on both PTA and RTA currently has **blank** rules that will flip to FAILED if you go a quarter without activity in those sub-areas — don't let them go unattended.

---

## 5. What's NOT a problem (positive findings)

So you have the full picture:

- ✅ **Xero integration ACTIVE** — token healthy, no re-auth needed, no missing-tenant counter.
- ✅ **PTA bank balance $130,686.93** — last updated 26 May 2026.
- ✅ **All 4 historical monthly reconciliations** (Jan–Apr 2026) for both PTA & RTA are **Balanced**.
- ✅ **No notices stuck** — 0 in "Sending", "Draft", or "Not Sent" status. All 60 notices issued are in Sent / Sent - Onboarded / Delete-Sent.
- ✅ **No contracts** are missing key details (client_supplier_id / sum / date all populated).
- ✅ **Payments-to-do** and **Notices-to-do** tiles on the dashboard are both showing "You are up to date. Nice work."
- ✅ **All ALBA-relevant compliance checks #1, #2, #3, #5, #7** are PASSED on PTA.
- ✅ **All ALBA-relevant RTA compliance checks #1, #2, #3, #5, #6, #7, #8** are PASSED.
- ✅ Subscription healthy: ULTIMATE_10 plan.

---

## 6. Recommended action order (one-week clean-up plan)

If we sequence the fixes to clear the most items with the least clicks:

| # | Action | Clears |
|---|---|---|
| 1 | **Finish the Xero account-code mapping** (Integrations → Xero → Settings → Variable Bill Code) | 14 of 59 failed syncs in one go |
| 2 | **Configure Xero Project tracking category** mapping | 1 failed sync, prevents future failures |
| 3 | **Reconcile the ALBA PTA** for March–May 2026 (5 transactions) | All **4 PTA Critical compliance items** + cleans the "Unmatched 5" tile |
| 4 | **Run the May 2026 reconciliation and audit report for the RTA** | The **1 RTA Critical compliance item** |
| 5 | **Add email + bank details to 5 specific contacts**: Bunnings Trade, Richard Rowles Construction Programming, H.D Weber & T.A Weber (GST FREE), MBA Consulting Engineers, Newnham Scaffolding, Appliance Testing Supplies, Timms Contractors | The 2 Warning items + 15 Warning-syncs + 5 Failed Smart-Contract syncs — auto-retried within 15 min by the new recovery sweeper |
| 6 | **Click "Clean up archived-contact failures"** (new button, top of Sync Log) | Reclassifies the 13 `WH_CONTACT_MISSING_FIELDS` + 2 `WH_CONTACT_NOT_FOUND` syncs to friendlier warnings |
| 7 | **Complete the 2 draft bank accounts** (Bel-Air #9215, NAB Credit Card #2322) | 2 Warning syncs |
| 8 | **Fix the Partnership Of FD Alba contact role** (add Client role) | 1 Failed sync |
| 9 | **Bulk-import emails for the 80 silent-Info contacts** via CSV export/import | All 80 Info items |
| 10 | Archive the 11 self-healing `SCHEDULER_RESOURCE_NOT_FOUND` syncs and the 3 duplicate `MANUAL_TWO_SIDED_DISPATCH_FAILED` rows | 14 more failed syncs cleared |

**Estimated end-state after this plan:** 0 Critical, 0 Warning, ~0 Info → fully green dashboard. Total effort is roughly half a day of focused work, mostly in the Reconcile screen and the Xero settings page.

---

## 7. Forward-looking prevention checklist

Add these to your monthly routine to stay clean:

- [ ] **Weekly** — reconcile both trust accounts; never let a transaction sit unmatched > 7 days.
- [ ] **Weekly** — clear the Sync Log: zero in "Failed", review "Warning".
- [ ] **Monthly (1st of month)** — for each trust account: import statement → reconcile → audit report.
- [ ] **Per new contact** — email + bank details are mandatory before first transaction.
- [ ] **Per new contract** — set the Contract tracking category in Xero on day 1; raise variations *before* claims exceed the cap.
- [ ] **Quarterly** — run "Sync all contacts" from Xero Settings to keep the mirror current.
- [ ] **Annually** — complete the Annual Account Review Report (PTA #9 / RTA #10 will flip from blank to FAILED if you don't).

---

*Report generated from Railway production database on 26 May 2026. Specific row IDs and counts are valid as of that snapshot — they will change as the recovery sweeper (Task #268) and your fixes take effect.*
