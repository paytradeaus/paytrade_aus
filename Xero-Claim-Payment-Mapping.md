# Xero ↔ PayTrade: Claim & Payment Type Mapping

This document describes how PayTrade identifies and maps different claim types and payment types when syncing with Xero. It covers the decision logic, line item structures, account code assignments, and direction handling for each scenario.

---

## 1. How Claim Type Is Determined

### 1.1 Direction: Receivable vs Billable

The claim direction determines whether PayTrade creates a Xero **Invoice** or a **Bill**.

| PayTrade `claim_type` | Xero Document | Xero Type Code | Determined By |
|---|---|---|---|
| **Receivable** | Invoice | `ACCREC` | Contact is a Client |
| **Billable** | Bill | `ACCPAY` | Contact is a Supplier |

**Export (PayTrade → Xero):** The `claim_type` field is set when the user creates the claim. It defaults based on the contact's Client/Supplier type but can be overridden by the user.

**Import (Xero → PayTrade):** The system reads the Xero invoice's `type` field (`ACCREC` or `ACCPAY`) and maps it directly:
- `ACCREC` → Receivable
- `ACCPAY` → Billable

### 1.2 Retention Type: Standard Claim vs Retention Release

The `cash_retention_type` field distinguishes between a standard progress claim and a claim that releases previously held retention.

| PayTrade `cash_retention_type` | Meaning |
|---|---|
| **Claim** | Standard progress claim (may include retention being held) |
| **Retention claim** | Release of previously retained funds |

**Export (PayTrade → Xero):** Set by the user or derived from the contract's retention settings at claim creation time.

**Import (Xero → PayTrade):** The system inspects the incoming invoice's line items by comparing each line's `accountCode` against the configured retention release codes:
- If any line item uses `retention_payable_release_code` (for Bills) or `retention_receivable_release_code` (for Invoices) → classified as **Retention claim**
- Otherwise → classified as **Claim**

**Validation rule:** If identified as a retention-related invoice, the system expects exactly **2 line items** (one retention line + one liability offset). If only one of those two is present, the import fails with error: *"There should be 2 line items for a retention"*.

---

## 2. Claim Line Item Structures

### 2.1 Standard Claim with Retention (`cash_retention_type = 'Claim'`, `cash_retention = true`)

When a standard progress claim has retention enabled, the system generates three types of line items:

#### Work Items (one per claim line)
Each line item from the claim is exported with the retention amount proportionally deducted.

```
Unit Amount = (line item amount) - retentionShare
```

Where `retentionShare` is calculated as:
```
retentionShare = (total retention amount × line item amount) / total of all line amounts
```

| Field | Receivable (Invoice) | Billable (Bill) |
|---|---|---|
| Description | Original line description | Original line description |
| Account Code | `invoice_code` | `bill_code` |
| Tax Type (if GST) | `invoice_tax_code` | `bill_tax_code` |

#### Retention Held (single line, positive amount)

| Field | Receivable | Billable |
|---|---|---|
| Description | "Retention Held" | "Retention Held" |
| Unit Amount | `retention_amount` (×1.1 if GST inclusive) | `retention_amount` (×1.1 if GST inclusive) |
| Account Code | `retention_receivable_retained_code` | `retention_payable_retained_code` |

#### Liability for Defects (single line, negative amount)

| Field | Receivable | Billable |
|---|---|---|
| Description | "Liability for defects" | "Liability for defects" |
| Unit Amount | `-retention_amount` (×1.1 if GST inclusive) | `-retention_amount` (×1.1 if GST inclusive) |
| Account Code | `liability_receivable_code` | `liability_payable_code` |

**Net effect:** The Retention Held and Liability for Defects lines cancel each other on the invoice total, but post the retention to the correct balance sheet accounts in Xero.

### 2.2 Standard Claim without Retention

When `cash_retention` is `false`, only the work item lines are generated — no retention or liability lines.

| Field | Receivable (Invoice) | Billable (Bill) |
|---|---|---|
| Description | Original line description | Original line description |
| Account Code | `invoice_code` | `bill_code` |
| Tax Type (if GST) | `invoice_tax_code` | `bill_tax_code` |

### 2.3 Retention Release Claim (`cash_retention_type = 'Retention claim'`)

When releasing previously held retention, the work item lines use the **release** account codes, and the supplementary lines reverse the original retention entries:

#### Work Items (one per claim line)

| Field | Receivable | Billable |
|---|---|---|
| Account Code | `retention_receivable_release_code` | `retention_payable_release_code` |

#### Liability for Defects (single line, positive amount — reversing the original)

| Field | Receivable | Billable |
|---|---|---|
| Description | "Liability for defects" | "Liability for defects" |
| Unit Amount | `retention_amount` (positive, ×1.1 if GST) | `retention_amount` (positive, ×1.1 if GST) |
| Account Code | `liability_receivable_code` | `liability_payable_code` |

#### Retention Release (single line, negative amount — clearing the retained balance)

| Field | Receivable | Billable |
|---|---|---|
| Description | "Retention Release" | "Retention Release" |
| Unit Amount | `-retention_amount` (×1.1 if GST) | `-retention_amount` (×1.1 if GST) |
| Account Code | `retention_receivable_retained_code` | `retention_payable_retained_code` |

---

## 3. Invoice-Level Properties

Every claim exported to Xero includes these properties:

| Property | Source |
|---|---|
| Type | `ACCREC` (Receivable) or `ACCPAY` (Billable) |
| Contact | Mapped via `XeroContactDetails` |
| Status | `DRAFT` or `AUTHORISED` (configurable per company) |
| Reference | `"{cash_retention_type} - # {payment_claim_id}"` |
| Line Amount Types | `Inclusive` (if GST optional) or `NoTax` |
| Date | `sent_date` (Receivable) or `received_date` (Billable) |
| Due Date | From claim's `due_date` field |

### Tracking Categories

Every line item includes two mandatory tracking category references:

| Tracking Category | Configuration | Stored In |
|---|---|---|
| **Project** | `project_category_id` in Xero settings | `XeroProjectDetails` (PT project → Xero tracking option) |
| **Contract** | `contract_category_id` in Xero settings | `XeroContractDetails` (PT contract → Xero tracking option) |

If either tracking category mapping is missing, the sync fails.

---

## 4. Payment Types

### 4.1 Standard Payment

Created when a payment is recorded against an already-authorised Xero Invoice or Bill.

| Property | Value |
|---|---|
| Xero API | `createPayment` |
| Linked To | Xero Invoice ID (`invoiceID`) |
| Bank Account | Mapped via `XeroBankAccountDetails` |
| Status | `AUTHORISED` (configurable to `DRAFT` via `pt_to_xero_payment_as_draft`) |
| Amount | Payment amount from PayTrade |

### 4.2 Standard Payment with Cash Retention Transfer

When `cash_retention = true` on the payment, the system creates **two** Xero records:

1. **Payment** — as described above (for the main amount)
2. **Bank Transfer** — moves the retention portion from the main bank account to the trust/retention bank account

| Bank Transfer Property | Value |
|---|---|
| Xero API | `createBankTransfer` |
| From Account | Main bank account (`xeroBankAccountDetails.account_id`) |
| To Account | Retention/trust bank account (`xeroRetentionBankAccountDetails.account_id`) |
| Amount | `retention_amount` |

### 4.3 Overpayment

Created when the payment amount exceeds what is owed on the invoice. Uses the Xero Bank Transactions API instead of the Payments API.

| Property | Receivable | Billable |
|---|---|---|
| Xero API | `createBankTransactions` | `createBankTransactions` |
| Transaction Type | `RECEIVEOVERPAYMENT` | `SPENDOVERPAYMENT` |
| Status | `AUTHORISED` | `AUTHORISED` |
| Line Amount Types | `NoTax` | `NoTax` |
| Line Item Description | "Overpayment" | "Overpayment" |

After creation, the system retrieves the resulting overpayment record via `getOverpayment` to store the `overpaymentID` for future reference.

### 4.4 Overpayment Refund

When an overpayment needs to be returned, the system applies a refund against the existing Xero overpayment.

| Property | Value |
|---|---|
| Xero API | `createOverpaymentAllocations` (refund allocation) |
| Linked To | Existing Xero `overpayment_id` |
| Source | PayTrade `payment_id` linked to the original overpayment `payment_id` |

### 4.5 Credit Note

Created to reduce the outstanding amount on an existing invoice or bill (e.g., retention adjustments, partial reversals).

| Property | Receivable | Billable |
|---|---|---|
| Xero API | `createCreditNotes` + `createCreditNoteAllocation` | `createCreditNotes` + `createCreditNoteAllocation` |
| Credit Note Type | `ACCRECCREDIT` | `ACCPAYCREDIT` |
| Status | `AUTHORISED` | `AUTHORISED` |
| Account Code | `invoice_code` | `bill_code` |
| Allocated To | Original Xero Invoice ID | Original Xero Bill ID |
| Line Amount Types | `Inclusive` (if GST) or `Exclusive` | `Inclusive` (if GST) or `Exclusive` |

The credit note is created first, then immediately allocated against the original invoice/bill.

---

## 5. Account Code Reference

All account codes are configured per company in the Xero Integration Settings (`XeroIntegrationDetails` entity):

| Setting Field | Used For |
|---|---|
| `invoice_code` | Revenue account for receivable claim line items |
| `bill_code` | Expense account for billable claim line items |
| `retention_receivable_retained_code` | Balance sheet: retention held on receivables |
| `retention_receivable_release_code` | Revenue: retention released on receivables |
| `retention_payable_retained_code` | Balance sheet: retention held on payables |
| `retention_payable_release_code` | Expense: retention released on payables |
| `liability_receivable_code` | Liability: defects provision on receivables |
| `liability_payable_code` | Liability: defects provision on payables |
| `invoice_tax_code` | Tax type applied to receivable line items |
| `bill_tax_code` | Tax type applied to billable line items |

---

## 6. Contract Mapping: Optional with Smart Resolution

*Updated 2026-03-29*

Contract mapping (linking PayTrade contracts to Xero Tracking Category options) is **optional**. The system no longer fails the sync simply because a contract tracking category or specific contract mapping is missing. This eliminates unnecessary sync failures for the common case where a supplier has only one contract per project.

### 6.1 Export (PayTrade → Xero)

When exporting a claim to Xero:

- If the contract is mapped → the contract tracking category is included on each line item (as before).
- If the contract is **not** mapped → the sync proceeds without the contract tracking category. The invoice/bill is created in Xero with only the project tracking category on line items.
- The claim is still correctly linked to its PayTrade contract — the only impact is reduced granularity in Xero's tracking reports.

### 6.2 Import (Xero → PayTrade) — Smart Contract Resolution

When importing an invoice/bill from Xero, the system attempts to resolve the PayTrade contract in this order:

1. **Tracking ID match** (existing behaviour): If the invoice carries a contract tracking category and the tracking option is mapped to a PayTrade contract, use it directly.

2. **Single contract match** (new): If tracking doesn't resolve a contract, the system queries all active contracts for the same supplier and project. If only **one** contract exists, it is used automatically.

3. **Amount match** (new): If multiple contracts exist for the same supplier and project, the system compares the invoice total against each contract's adjusted value (`initial_contract_sum + sum of approved variations`). If exactly **one** contract matches the amount (within $0.01), it is used automatically.

4. **Fail on ambiguity**: The sync only fails if multiple contracts exist, none are uniquely identified by amount, and no tracking category is mapped. The sync log will show: *"Multiple contracts found for this supplier and project. Please map the contract in Xero tracking categories to resolve."*

### 6.3 When Is Contract Mapping Still Required?

Contract mapping is only strictly needed when **all** of the following are true:
- The same supplier has **2 or more** contracts under the same project
- The claim total does **not** uniquely match one contract's value (contract sum + approved variations)
- The Xero invoice does not carry a contract tracking category

This is an edge case. For most users, project mapping alone is sufficient.

### 6.4 Sync Failure Resolution

When a sync does fail due to contract ambiguity:
- The failure is recorded in the **Sync Log** and visible on the Xero Dashboard
- The Sync Log Details page shows a "Resolve" button that opens a mapping modal
- The user can select the correct contract from a searchable dropdown
- After mapping, the sync can be re-triggered

---

## 7. Entity Mapping Reference

| PayTrade Entity | Xero Entity | Mapping Table | Key Fields |
|---|---|---|---|
| Bank Account (Cash/PTA/RTA) | Bank Account | `XeroBankAccountDetails` | `pt_bank_account_id` → `account_id` |
| Contact (Client/Supplier) | Contact | `XeroContactDetails` | `pt_contact_id` → `contact_id` |
| Project | Tracking Category Option | `XeroProjectDetails` | `pt_project_id` → `trackingOptionID` |
| Contract (optional) | Tracking Category Option | `XeroContractDetails` | `pt_contract_id` → `trackingOptionID` |

---

## 8. Validation Checks (Import from Xero)

When importing invoices or payments from Xero, the system runs these validation checks and logs the result:

| Check | What It Validates |
|---|---|
| Import data format validation | Line item structure matches expected patterns (e.g., retention must have 2 lines) |
| Import tracking id validation | Project tracking category is present and mapped |
| Import account type validation | All line item account codes match configured codes |
| Import tax type validation | Tax types are valid for the claim direction |
| Client/Supplier mapping validation | Xero contact is mapped to a PayTrade contact |
| Contract mapping validation | Contract resolved via tracking, single-contract match, or amount match (optional — only fails on genuine ambiguity) |
| Project mapping validation | Tracking option maps to a PayTrade project |

If any check fails, the import is rejected and a detailed sync log is created with the specific failure reason. Contract mapping failures only occur when multiple contracts exist for the same supplier and project and cannot be disambiguated by amount.

---

## 9. GST Handling

| Setting | Behaviour |
|---|---|
| `is_gst_optional = true` | Amounts are GST-inclusive. Retention amounts are multiplied by 1.1. Each line item includes `taxType`. Invoice uses `LineAmountTypes.Inclusive`. |
| `is_gst_optional = false` | Amounts exclude tax. No `taxType` on line items. Invoice uses `LineAmountTypes.NoTax`. |

---

## 10. Internal Journal Entries (Trust Accounts)

When a claim is confirmed and the contract is linked to a trust account, PayTrade also creates internal journal entries:

| Scenario | Journal Created |
|---|---|
| Billable Claim confirmed + PTA linked | Debit PTA, Credit cash account |
| Receivable Claim confirmed + PTA linked | Debit cash account, Credit PTA |
| Cash retention on Claim type | Additional journal for retention transfer to RTA |

These journal entries are internal to PayTrade and are separate from the Xero sync. They maintain the trust accounting compliance ledger within PayTrade itself.

---

## Key Source Files

| File | Responsibility |
|---|---|
| `back-end/src/api/common/integrations/xero/invoicesAndBills/xero-invoices.service.ts` | Claim export/import, line item construction, retention detection |
| `back-end/src/api/common/integrations/xero/payments/xero-payments.service.ts` | Payment, overpayment, refund, credit note, and bank transfer sync |
| `back-end/src/api/common/integrations/xero/xero.service.ts` | Settings management, token refresh, tracking categories |
| `back-end/src/api/users/banking/payment-claims/payment-claims.service.ts` | Claim creation, internal journal entry generation |
| `back-end/src/entities/xero-integration-details.entity.ts` | Account code configuration storage |
