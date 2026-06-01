---
name: Retention BULK vs xero_payments unique constraint
description: Why 1-transfer→N-retentions (BULK) cannot persist on xero_payments and must use the transfer-applications ledger
---

# Retention SPLIT/BULK persistence constraints

Inbound retention "paid" confirmation persists one `xero_payments` row per Xero
BankTransfer, guarded by `uq_xero_payments_bank_transfer_id` (UNIQUE on
`bank_transfer_id`). The confirm path hard-stops (Failed log template 340/443,
`return false`) if a transfer id is already used by any non-DELETED row.

`is_retention_confirmed` is NOT flipped on coverage today: the webhook
pre-calculates the flag from the matched PT payment's EXISTING sub-payment
states (a `Retention Out` sub-payment already non-null → set true) and passes it
to `paymentsService.editDetailsOfAPayment`. It is effectively 1 transfer ↔ 1
retention, exact-amount matched.

**Implications for the two new lanes:**

- **SPLIT (N transfers → 1 retention):** N transfers each get their own
  `xero_payments` row (distinct `bank_transfer_id`s → unique constraint is fine),
  all pointing at the same `pt_payment_id`. The matcher's per-transfer
  exact-amount filter must be bypassed for this case (split legs are each < gross
  but sum to gross). `is_retention_confirmed` must flip only when cumulative
  applied across the rows ≥ expected gross (±$0.01) — "accumulate-then-tick".

- **BULK (1 transfer → N retentions):** BLOCKED by the unique constraint — you
  cannot create N `xero_payments` rows sharing one `bank_transfer_id`. BULK must
  persist the transfer→payment links in the `xero_transfer_applications` ledger
  (the T002 table), NOT on `xero_payments.bank_transfer_id`. The ledger becomes
  the source of truth for "how much of this transfer is already consumed", and
  the confirm flag flips on cumulative ledger coverage per retention.

**Why:** the unique constraint was added to stop phantom/duplicate transfer
mirror rows; relaxing it would reopen that bug class. The ledger was created
specifically to be the many-to-many join so the unique constraint can stay.

**How to apply:** any SPLIT/BULK implementation routes coverage accounting
through `xero_transfer_applications` and gates `is_retention_confirmed` on
cumulative coverage; it must not pre-calculate the flag from existing
sub-payment state, and must not drop/relax `uq_xero_payments_bank_transfer_id`.

## BULK = self-only, ledger-only; each claim confirms ONLY itself

A single PTA→RTA bulk transfer releases several pending retentions. Each claim,
on its own sync, confirms ONLY itself when a UNIQUE subset of pending retentions
(that includes the current claim) sums EXACTLY (±$0.01) to the transfer's
REMAINING capacity (`transfer.amount − ledgerAppliedAcrossAllPayments`). Summing
to *remaining* (not "fits within") is what keeps it an exact-bundle match and not
a loose balance draw-down. Ambiguity (>1 hosting transfer, or non-unique subset)
→ Failed log, never guess on trust money. No `xero_payments` row is ever written
for BULK (shared transfer id), so the ledger is the only proof of reconciliation.

**Concurrency — capacity consume MUST be atomic.** The webhook runs on TWO
separate BullMQ workers (wait-queue + recovery) that both call
`createClaimInPaytrade`; default worker concurrency is 1 but cross-worker
parallelism is real. The match detector reads remaining capacity OUTSIDE any
lock, so the capacity check + ledger write must happen together under a
`pg_advisory_xact_lock(hashtext(integration_id), hashtext(bank_transfer_id))`
that RE-READS what *other* payments applied and refuses to write when a sibling
already took the dollars. Idempotent for the same (transfer, payment) on re-sync
(its own prior leg stays available to itself).
**Why:** without the re-check-under-lock, two siblings each pass a stale
remaining read and both write → the same transfer dollars applied twice.

**Re-sync guard must check the confirm flag, not just coverage.** A BULK-covered
retention has no `xero_payments` mirror, so re-syncs fall through to "no transfer
identified" unless guarded. Guard on ledger coverage ≥ gross — but if a prior run
wrote the ledger then crashed before flipping `is_retention_confirmed`, returning
early on coverage alone leaves the payment forever unconfirmed while reporting
success. Short-circuit only when covered AND already confirmed; otherwise finish
the confirm tick.
