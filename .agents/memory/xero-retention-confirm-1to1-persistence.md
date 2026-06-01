---
name: Xero retention confirm is 1:1 transfer↔payment
description: Why SPLIT/BULK retention matching needs a persistence rework, not just a smarter matcher
---

The inbound retention "paid" confirmation path (webhook.service.ts `createClaimInPaytrade`
flow, retention branch) is built on a **1:1 BankTransfer↔payment assumption**:

- A single matched transfer's id is written to `xero_payments.bank_transfer_id`
  (which has a UNIQUE constraint), and `is_retention_confirmed` is flipped through
  the large `addOrDeletePaymentInPaytrade` → `editDetailsOfAPayment` machinery.
- The matcher (`matchRetentionTransferCandidates`) only ever produces `matched[]`
  that the downstream collapses to ONE `bankTransferID`; 0 → fail, >1 → hard-stop
  fail (template 490). There is no notion of partial/cumulative coverage.

**Why it matters:** SPLIT (N transfers → 1 retention) and BULK (1 transfer → N
retentions) with accumulate-then-tick CANNOT be done by only generalising the
matcher. They require routing confirmation through the consumption ledger
(`xero_transfer_applications`) and only flipping `is_retention_confirmed` once
cumulative applied ≥ expected gross (±$0.01). That is a persistence-model rework
of the confirm path, distinct from (and larger than) the trust-movement lane.

**How to apply:** Treat retention SPLIT/BULK (the "auto retention lane") as its own
sizeable change that touches `addOrDeletePaymentInPaytrade` persistence. The
trust-movement classification lane (`handleInboundTrustMovementBankTransfer` in
xero-payments.service.ts → fail-for-input dropdown) is independent and self-contained.
