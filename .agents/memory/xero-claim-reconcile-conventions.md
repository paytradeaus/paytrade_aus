---
name: Xero claim_amount convention vs reconciler
description: The inbound Xero mapper and the payment-claims reconciler must agree on ONE convention for what claim_amount represents relative to stored line items + retention_amount_with_gst.
---

## Rule

For any code path that writes a `payment_claims` row with `cash_retention=true`, the header must satisfy:

```
claim_amount = Σ(quantity × unit_price)  +  Σ gst  +  retention_amount_with_gst
```

This is enforced by the reconciler in `payment-claims.service.ts` (CLAIM_RECONCILE_FAIL guard, tolerance $0.10). There are no exceptions.

## Why

Two mapper conventions existed in parallel:

- **`mapItemsDirectly`**: stores lines as Xero sent them (already reduced by retention). Header must add `retention_amount_with_gst` on top to be economically correct.
- **`adjustItemsWithRetention`**: scales work lines UP to fold the retention slice into the line subtotal, then recomputes a "clean 10%" GST. Header is self-consistent with the lines and does NOT need retention added — but then `retention_amount` stored as a separate field would double-count.

The two conventions disagree on what `claim_amount` means by exactly `retention_amount_with_gst`. Pre-guard, the webhook V/D-Step paths used `adjustItemsWithRetention` AND omitted retention from the header → silently produced 37 mismatched rows in the Demo company over April–May 2026 (header short of lines+gst+retention by exactly the retention). The guard added on 2026-05-16 then started rejecting every new cash-retention import (Timms 018277 was the first real one).

## How to apply

- Default to `mapItemsDirectly` for any cash-retention inbound path. Add `retention_amount_with_gst` to `claim_amount` using the same gross-up formula that builds the `retention_amount_with_gst` field itself.
- The `adjustItemsWithRetention` helper still exists for non-cash-retention bills (it's a no-op for retentionUnitOnly=0) but should not be paired with a "no-retention-in-header" formula. If you ever revive it for retention paths, set `retention_amount_with_gst = 0` so the reconciler passes — but then PT loses the retention-tracking field and downstream payment flows break, so this is almost never what you want.
- When changing any mapper site that produces a `payment_claims` row, walk all three known sites and keep them aligned:
  - `webhook.service.ts` V-Step (create path)
  - `webhook.service.ts` D-Step (update path)
  - `xero-invoices.service.ts:3091` (already correct; uses the right header formula even when paired with `adjustItemsWithRetention` because lines are scaled-up and retention is added on top — economically double-counts but is self-consistent and passes the reconciler)
- Sandbox/test rows that pre-date the guard will still mismatch. Backfill is only worth it if a live tenant is affected.

## Related silent-success trap

The mapper failure surfaced as a fake "Succeeded" because `validateAndProcessWebhookInvoice`'s catch block fell through without returning (→ `undefined`), and `manualXeroResync` used `=== false` strict equality. Two invariants to preserve forever:

- Every catch in `validateAndProcessWebhookInvoice` must `return false`.
- Every caller that interprets the return value must treat anything that isn't an explicit `true` as failure (use `!== true`, not `=== false`). The MEMORY topic `xero-success-requires-real-id.md` captures the parallel rule for outbound success gating.
