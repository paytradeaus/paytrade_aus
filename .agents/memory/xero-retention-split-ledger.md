---
name: Xero retention SPLIT auto-match & consumption ledger
description: Invariants for auto-matching a retention from multiple PTA->RTA transfer legs (ex-GST + GST) via the xero_transfer_applications ledger.
---

# Retention SPLIT auto-match (multiple transfer legs -> one retention)

When the exact 1:1 transfer↔retention match misses, the inbound webhook tries a
SPLIT: a unique combination of >=2 in-window PTA->RTA transfer legs whose absolute
amounts sum to the retention gross (±$0.01). Chosen legs are recorded in the
`xero_transfer_applications` ledger so a transfer's dollars are never applied twice.

## Durable invariants (do not regress)

- **Record ALL legs in the ledger on BOTH materialization paths.** A PT payment's
  `bank_transfer_id` column links only ONE (primary) leg. The remaining legs are
  double-spend-protected ONLY by ledger rows. The create-new-payment path and the
  edit-existing-payment path are separate branches — both must record. Missing the
  create path silently leaves non-primary legs reusable by a later retention.
  **Why:** the create branch sets `is_retention_confirmed: true` from claim shape,
  not from the transfer match, so it's easy to confirm without consuming the legs.

- **A SPLIT subset always sums to the gross by construction** (the detector requires
  an exact subset-sum). So on the create path coverage == gross and confirming
  immediately is correct; accumulate-then-tick (defer + Warning template 633) only
  meaningfully fires on the edit path / incremental leg arrival / future BULK.

- **Ambiguity = trust-money stop.** Treat MORE THAN ONE distinct exact subset within
  a from->to group as ambiguous — use `findTransferSubsetForTarget`'s `exactCount > 1`,
  not just its `ambiguous` flag (which only flags ties at the minimal cardinality and
  misses a small subset + a larger exact subset). Any ambiguity -> Failed (template
  634), never auto-post.

- **excludeIds before matching** = ledger-consumed transfer ids ∪ transfer ids already
  on non-DELETED `xero_payments`, and the payments lookup MUST be scoped by
  `integration_id` (bank_transfer_id can collide across tenants).

- **Ledger unique key is (bank_transfer_id, pt_payment_id)** — idempotent per leg per
  payment, but it does NOT by itself stop the same transfer being applied to two
  different payments; that protection comes from the exclude-id pre-filter. Detect ->
  exclude -> record is not atomic, so concurrent webhook workers on the same
  integration are the residual race (webhook queue is serialized per integration).

## Scope note
SPLIT (ex-GST + GST -> 1 retention) is built. BULK (1 transfer -> N retentions) is a
separate deferred follow-up — it is the case where accumulate-then-tick with partial
coverage genuinely matters.
