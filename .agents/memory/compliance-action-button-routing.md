---
name: Compliance action-button routing must point at the remediable surface
description: How to choose Claims vs Payments destination for s76-style compliance action buttons, and why a claim's presence in "Payments to do" depends on payment_details state.
---

# Compliance action-button routing

When a compliance FAILED row offers an action button, it must route to where the
breach can actually be fixed — not to a list the breaching item isn't in yet.

**Key data fact:** a `payment_claim` only appears in the "Payments to do" / Not
Paid list once a payment has been *initiated* against it — i.e. a `payment_details`
row exists for that `payment_claim_id` with `current_status LIKE 'Unconfirmed%'`
(all to-do statuses are `'Unconfirmed - …'`). A breaching claim with no such row is
still awaiting a response from the **Claims** list (`/user/claims`), so a
"View Payments" button (`/user/payments-to-do`) lands on an empty page.

**Rule applied (s76 Check 6, rule 26):** split breaching claims into
claims-awaiting-response (no pending `payment_details`) vs payments-in-progress
(has `Unconfirmed%`), then emit `VIEW_CLAIMS`, `VIEW_PAYMENTS`, or the combined
`VIEW_CLAIMS_AND_PAYMENTS` (frontend renders two buttons for the combined value).

**Why:** the original single "View Payments" button was the wrong destination for
the common case (claims confirmed but never paid) — empty page, no path to remedy.

**How to apply:** adding a NEW `action_button_type` value requires a migration —
prod runs with `synchronize: false` + `migrationsRun: true`, so the enum
(`compliance_rule_action_button_type_enum`) won't pick up entity-only changes;
use `ALTER TYPE … ADD VALUE IF NOT EXISTS`. The computed value persists into
`compliance_rule` and the FE re-reads a fixed column set (`action_button_type`,
`reference_id`, …), so any new display data must ride on those existing columns,
not a brand-new ad-hoc field on the result object.
