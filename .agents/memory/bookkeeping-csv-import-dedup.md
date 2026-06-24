---
name: Bookkeeping CSV import has no duplicate detection
description: How the same real bank debit can be imported twice and matched to two payments, producing phantom duplicate withdrawals/payments
---

# Bookkeeping CSV import — no duplicate detection + date-parse divergence

The bookkeeping bank-transaction matcher (`transaction_details`) matches **1 uploaded
bank line ↔ 1 sub-payment**. `transaction_details.matched_payment_ids` references
`sub_payments.sub_payment_id` (NOT `payment_details.payment_id` and NOT the journal
`audit_id`). Status flow: payment Unconfirmed → Confirmed (checkbox, or auto if synced
from Xero) → **Matched** once a sub-payment is matched to an uploaded bank line.

**The gap:** re-uploading a CSV that contains already-imported transactions creates
**fresh duplicate `transaction_details` rows** — there is no check that a bank
transaction was already imported. Those new rows look "unmatched" and can be matched to
a second (duplicate) payment. Net effect: one real bank debit → two bookkeeping lines →
two matched payments → phantom duplicate withdrawal/payment overstating the ledger.

**What makes it invisible:** CSV date parsing can differ between uploads (DD/MM vs
MM/DD). A real debit dated 04/06 was stored as **6 Apr** on the first upload but **4 Jun**
on a later re-upload of the same statement — so even a date+amount dedup check would treat
them as different transactions.

**Why:** observed on the ALBA project trust account — a $20k (04/06) and $25k (08/06)
debit each existed once at the bank but twice in bookkeeping after a 24/06 re-upload, each
copy matched to its own duplicate withdrawal payment (+$45k overstatement).

**How to apply:** when "duplicate" payments/withdrawals appear, check
`transaction_details` for duplicate uploaded lines (same amount, different parsed dates),
not just `payment_details`. The 1:1 matcher means two payments can never share one bank
line — a second matched payment implies a second uploaded line. Also note the match writer
does not persist the acting user (`transaction_details.updated_by` is null); attribute via
`created_group`/`updated_group` = USER plus activity-log timing.
