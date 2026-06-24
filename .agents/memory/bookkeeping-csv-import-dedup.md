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

**What made it invisible (root cause, now fixed):** the old CSV date parser fell back to
native `new Date('4/06/2026')`, which JS treats as **US month-first** → 6 Apr instead of
4 Jun. AU bank exports are day-first and ship single-digit days, so the same real debit
was stored under two different dates across uploads, defeating the amount+date dedup screen.
Fix: `parseBankTxnDate()` in `transactions-date.util.ts` parses numeric dates explicitly as
day-first (`D/M/YYYY`) / ISO via regex into UTC, rejecting rollover invalids; native parse
only remains for non-numeric (textual) shapes. Wired into `storeInTemporaryTable`. NOTE:
moment 2.30.1 strict mode rejects single-digit days even with the `D` token — do not rely
on moment strict array parsing for these; the manual regex is the canonical path.

**Why:** observed on the ALBA project trust account — a $20k (04/06) and $25k (08/06)
debit each existed once at the bank but twice in bookkeeping after a 24/06 re-upload, each
copy matched to its own duplicate withdrawal payment (+$45k overstatement).

**How to apply:** when "duplicate" payments/withdrawals appear, check
`transaction_details` for duplicate uploaded lines (same amount, different parsed dates),
not just `payment_details`. The 1:1 matcher means two payments can never share one bank
line — a second matched payment implies a second uploaded line. Also note the match writer
does not persist the acting user (`transaction_details.updated_by` is null); attribute via
`created_group`/`updated_group` = USER plus activity-log timing.
