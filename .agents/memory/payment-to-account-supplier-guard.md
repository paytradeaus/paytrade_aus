---
name: payment_to_account supplier validation
description: Why payment_to_account must be validated against the claim's supplier, not just company ownership, and how auto-resolve must be keyed.
---

# payment_to_account must match the claim's supplier, not just the company

When creating/editing a payment, the destination bank account
(`payment_details.payment_to_account`) is only trustworthy if it belongs to the
right party. Two checks are required, in order:

1. **Company ownership** — the account's `company_id` must equal the payment's
   company (tenant isolation).
2. **Supplier ownership** — if the account is a *supplier-owned cash account*
   (`bank_accounts.client_supplier_id` IS NOT NULL), it must belong to the
   payment's supplier. If it belongs to a different same-company supplier,
   clear it and let auto-resolve repopulate.

**Why:** A real bug routed claim payments to a different supplier's cash account
(a claim for supplier A whose to-account was owned by an unrelated same-company
supplier B). Validating only company ownership let a stale/global account through. The
supplier *name* on the payment still rendered correctly, masking the wrong
destination — only the ABA/remittance bank details were wrong.

**How to apply:**
- Skip the supplier-mismatch check for `3rd Party` payments (intentionally a
  different payee) and for company-owned trust accounts
  (`client_supplier_id` NULL, e.g. Receivable claims) — clearing those would
  break legitimate flows.
- Derive a single canonical supplier id: when the payment is claim-tied, the
  **claim's** `client_supplier_id` is authoritative — never the request
  payload's `client_supplier_id` (a client can set it to another same-company
  supplier). Use that same value for BOTH the mismatch check AND the
  auto-resolve query, or a clear can be followed by an auto-fill from the wrong
  supplier.
- Compare with `Number(...)` on both sides to avoid string/number false
  negatives.

**Note:** `payment_to_account` lives only on `payment_details` and is NOT part
of the `xero_payments` link record, so correcting it on already-reconciled
payments does not break Xero reconciliation. But it does not move money already
sent — retroactive correction of paid records is a business decision.
