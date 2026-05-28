---
name: Xero retention bill inbound — offsetting retained lines
description: Inbound retention reducer treats sign-cancelling retained sub-lines as additive, so retention adjustments that net to zero import as phantom retention.
---

When an inbound Xero ACCPAY/ACCREC bill carries multiple lines on the retention retained-code account whose **signed sum is zero** (a typical pattern when a human user corrects a prior retention posting with a reversal + re-post on the same bill), the inbound retention reducer treats them as additive — `|-X| + |+X| = 2X` — and the imported PT claim ends up with `cash_retention=true` and double-counted phantom retention that the operator must manually delete.

**Why:** The reducer was written to handle the normal single-retained-line shape and never anticipated sign-cancelling sub-lines. Producer-side code does not emit them, so the bug only surfaces on bills authored by humans or by third-party accounting tools.

**How to apply:** When touching the inbound retention reducer (both the standard and inc-GST split branches, in both create and update code paths), sum signed amounts first and only then take the absolute value. Treat a signed sum that rounds to zero as "no retention" and skip the cash-retention path entirely. Producer-side retention emission does not need a parallel fix.

**What is NOT a bug here (verified by reproducible harness):** The retention prorate formula in the line-merge step looks suspicious — it divides each line's `lineAmount` by the invoice's `subTotal + totalTax` (which is Xero's net-of-retention header total). On inspection this *looks* like it would under-allocate retention on single-line bills by ~9%. It does not. For Exclusive bills, `lineAmount` is computed as `unitAmount*qty + taxAmount` (gross), so both numerator and denominator are gross of GST and the ratio resolves to 1.0 on a single-line bill, recovering retention in full. The worked-example output `15724.00 + 1572.40 = 17296.40` reproduces exactly. Do not "fix" this path.

**Verification:** Reproducible via `node back-end/test/run-retention-bill-import-verification.js` against the per-scenario fixtures in `back-end/test/fixtures/xero/`. Full per-scenario verdict in `docs/architecture/xero-retention-bill-import-verification.md`.
