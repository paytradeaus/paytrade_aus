---
name: Trust ledger out-of-balance from one-sided bank sweep recording
description: Why a PTA ledger can sit temporarily out-of-balance vs the bank when only the inbound leg of a zero-sum bank "automatic drawing" round-trip is recorded
---

# Trust account (PTA) balance reconstruction

The project-trust-account cash balance is NOT `SUM(debit-credit)` over all `journal_entries` for the account — every movement posts **two legs** that BOTH carry the same `bank_account_id`, so summing all legs nets to zero. The cash balance is only the **bank leg**: join `journal_entries.journal_process_id → journal_type.process_id` and filter `journal_type.beneficiary_type = 'bank'` (account PTA/RTA), live rows only (`is_reversed = false`), then `SUM(debit_amount - credit_amount)`. Debit = cash in, credit = cash out (trust internal convention; a receipt is a debit on the bank leg).

`getTrustAccountingBalanceByAccountId` / `fetchAccountLedgerByAccountId` order by `journal_date` then a creation-order tiebreaker; running balance is computed in memory.

# The one-sided bank-sweep out-of-balance pattern

**Why:** NAB trust accounts run an "AUTOMATIC DRAWING" cash-sweep — money is swept OUT to the trustee/linked account and returned IN the same day (net zero at the bank). PayTrade's automated inbound matcher records the **return/credit** legs as `Top Up` payments (`payment_type='Top Up'`, from associated cash acct → PTA, created_group SYSTEM, journal process 131 "Top up trust account from trustee - beneficial interest"), but the matching **outbound** sweep debits are NOT auto-created. Recording only the inbound half of a zero-sum round-trip inflates the PTA balance by the sweep amount.

**How to apply:** When a user reports the PTA balance is "too high" / "out of balance" vs the bank on a given date:
1. Reconstruct the bank-leg running balance (above) and the bank statement running balance, compare per-date.
2. Look for days where `Top Up` inflows were captured but matching outbound debits ("AUTOMATIC DRAWING", "Linked Acc Trns", invoice-named TRANSFER DEBIT) were not. A day that nets to zero at the bank but shows a large positive net in PT is the smoking gun.
3. Contrast with a day where the same round-trip WAS recorded on both legs (e.g. a Top Up matched by contractor payments of the exact same total nets to zero correctly) — proves the ledger math is fine; the inputs are asymmetric.
4. The out-of-balance is usually a **timing/data-capture gap, not a calc bug** — it often self-corrects later when the offsetting outbound entry is finally recorded (both balances re-converge to the same figure on a later date). Always extend the comparison to the latest date before concluding the gap is permanent; the residual end-date gap is the real net error.

Distinct from genuine duplicates (two live withdrawals with no offsetting reversal), which are a permanent overstatement and need deletion.
