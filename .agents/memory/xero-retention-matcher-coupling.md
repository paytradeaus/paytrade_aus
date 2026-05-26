---
name: Xero retention matcher coupling
description: The Xero retention bank-transfer matcher is not standalone — repair of an unmatched leg requires re-running the whole invoice handler.
---

# Xero retention matcher is coupled to the invoice handler

`XeroWebhookService.matchRetentionTransferCandidates` is a **pure**
helper (takes pre-fetched bank transfers, returns matched / out-of-
window / matched-by-reference). It has no DB writes, no Xero API
calls, no logging.

The actual side-effects that link a retention BankTransfer leg to a
PT payment row live **inside** `handleInvoiceCreateUpdate` — the
matcher is called once, then the surrounding code writes
`xero_payments.bank_transfer_id`, emits sync logs, etc.

**Why this matters:** any feature that wants "just repair the
unmatched leg, don't re-import the whole bill" cannot dispatch to a
separate service today. It has to either:

1. Re-run the full handler (expensive, can produce spurious Failed
   logs if any step transiently misbehaves — this is exactly what
   Task #302's change-detection gate guards against).
2. Extract a new "repair-leg-only" service that wraps the matcher
   with just the bank_transfer_id write + minimal logging.

`trustMovementCatchupSync` is NOT a substitute — it scans Xero
BankTransfers for only the last 14 days, while
`recheckUnmatchedRetentionTransfers` and the matcher itself operate
on a 90-day window. A blanket "skip already-imported bills" filter on
the retro-recheck cron silently drops leg-repair for the 15–90 day
gap.

**How to apply:** if you ever consider gating the retro-recheck cron
on `pt_claim_id IS NOT NULL` or otherwise short-circuiting bills
based on import status, you must first extract the leg-repair side
effects out of `handleInvoiceCreateUpdate` so leg-repair survives the
gate.
