---
name: payment_to_account supplier-mismatch guard vs trust accounts & deleted duplicates
description: Why addPayment's supplier-mismatch guard can wrongly null a valid trust account and crash the receivable journal with a null bank_account_id.
---

# addPayment supplier-mismatch guard vs trust accounts / deleted client duplicates

The guard in `addPayment` (payments.service.ts) nulls `payment_to_account` when the
caller-supplied bank account's owning `client_supplier_id` differs from the payment's
supplier. It was written assuming trust accounts have a NULL `client_supplier_id`.

**Two ways that assumption breaks:**
1. A Project/Retention Trust Account CAN be tagged to a specific client_supplier_id.
2. The owning client record can be a soft-deleted (`is_deleted`) / archived
   (`is_archived`) **duplicate** of the same real-world entity (same ABN) re-entered
   under a new id. The claim points at the live duplicate; the bank account still
   points at the dead one → ids mismatch → guard nulls the account.

**Why it crashes (the silent amplifier):** the receivable journal gate does
`findOne(BankAccounts, { where: { bank_account_id: paymentDetails?.payment_to_account } })`.
In TypeORM 0.3.x, an `undefined` where value is **stripped**, so the query returns an
**arbitrary** account (the first row), the gate passes, and `createJournalEntries` is
called with an empty bankAccountId → `null value in column "bank_account_id" of
relation "journal_entries"`. So a missing destination account surfaces as a confusing
null-insert, not a clear "no account" error.

**Fix applied:** before clearing, look up the owning client; if `is_deleted` or
`is_archived`, treat the binding as stale and KEEP the caller-supplied account.

**Still latent (not fixed, recommended):** the `findOne({where:{bank_account_id:
undefined}})` → arbitrary-row behavior is a general trap. A hard pre-journal invariant
("no resolved bank account id → fail fast with a descriptive error") would catch every
variant, not just the deleted-duplicate one.

**Related:** duplicate client/supplier records are the upstream cause. Exact-name
duplicate checking misses them when the same ABN is entered under a different name;
match on ABN/ACN (digits-only) instead. See `findActiveDuplicateByIdentifier` in
client-suppliers-details.service.ts (insert flow only — update/import paths still
unguarded).
