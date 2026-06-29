---
name: Journal stale account + beneficiary-ledger fan-out
description: Why a corrected payment_to_account leaves stale trust journals, and why one stale journal can appear on two beneficiary ledgers.
---

# Stale journal account + beneficiary-ledger fan-out

Two coupled defects in trust accounting (payment-claims.service.ts journal creation +
journals.service.ts `fetchAccountLedgerByAccountId`):

## 1. Journals snapshot `payment_to_account`; later edits don't regenerate them
The supplier-leg of a payment journal copies the payment's `payment_to_account` into
`transaction_account_id` at creation time. If `payment_to_account` is corrected later
(e.g. fixing a supplier-mismatch where supplier A's payment was bound to supplier B's
cash account), the already-created journal is NOT regenerated — it keeps the wrong account.

**Also unreliable:** the reverse-on-correction path is asymmetric. In one observed case a
correction created reversal journals, but the reversal credited the *new* (corrected)
account instead of mirroring the *original* wrong account — so the reversal failed to
neutralize the original contaminating leg (left a phantom balance on the wrong sub-account).

## 2. Beneficiary ledger fans one journal onto multiple ledgers
The report resolves each row's beneficiary *name* from a subquery keyed on
`(transaction_account_id, beneficiary_type)` and joins on those two columns only — NOT on
the journal's own `supplier_id`. When a stale leg makes one `transaction_account_id` map to
two different supplier names (supplier B's real journals + supplier A's stale journal both
pointing at B's cash account), the join fans EVERY journal on that account onto BOTH
beneficiaries' ledgers. Symptom: the same audit_id shows on two sub-account ledgers
("duplicate journal"), though only one physical row exists.

**Why:** the join trusts `transaction_account_id` as a proxy for beneficiary identity; a
single bad account pointer collides two beneficiaries.

**How to apply / fix classes:**
- Targeted prod repair = update the stale leg's `transaction_account_id` to the corrected
  account (guard the UPDATE on company_id + journal_system_ref + old account value).
- Code hardening: (a) regenerate/realign journal legs whenever `payment_to_account` changes,
  and make reversals mirror the ORIGINAL account; (b) group/resolve supplier & client
  beneficiary rows in the ledger by `supplier_id`/client id, not `transaction_account_id`,
  so a single stale leg can't cross-contaminate; (c) guard payment_to_account so a
  supplier's payment can't be bound to another supplier's cash account (see
  payment-to-account-supplier-guard.md).
