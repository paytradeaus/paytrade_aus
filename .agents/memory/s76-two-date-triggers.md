---
name: s76 BIF Act — two distinct date triggers
description: The compliance non-compliance flag and the payment-dialog "missed schedule window" warning key off DIFFERENT dates; do not conflate them.
---

# s76 BIF Act — two distinct date triggers

QLD BIF Act s76 ("respond to every payment claim on time") drives two separate
PayTrade behaviours that must key off **different** dates:

1. **Compliance non-compliance flag** (the red banner / Check 6, rule 26/27 in
   `pta-functions.ts`): a Billable claim is flagged ONLY when `today > due_date`,
   still unpaid, and no Supplier Payment Schedule Notice in a Sent state.
2. **Payment-dialog warning** ("you are past X — you have missed the window for a
   payment schedule"): fires on Save in `PaymentFooterSection.tsx` when a Billable
   claim is paid as anything other than Full AND `today > received_date + 15
   business days`. Non-gating (acknowledge → proceed).

**Why:** Paying a claim in full discharges the s76 obligation, so a head contractor
who pays in full any time up to the due date is compliant — the banner must not
fire before the due date. The 15-business-day mark is only the deadline to *give a
payment schedule*; it is the right trigger for the "you missed the schedule window"
warning, but it is NOT the breach trigger for the compliance flag.

**How to apply:** When touching s76 logic, keep these two date bases separate.
Never reintroduce a `received_date + 15bd` early-breach into the compliance flag,
and never base the payment-dialog schedule-window warning on `due_date`. Client-side
the 15bd estimate is weekend-aware only (no holiday calendar); the backend
compliance check is the source of truth.

**Banner copy:** the s76 breach banner (check_name "PAYMENTS TO SUBCONTRACTORS")
must say claims are flagged when unpaid/unresponded **by their due date** — NOT
"the earlier of 15bd or due date". The copy is seeded from
`back-end/src/libs/@seeders/compliance-seed-data/pta-compliances.json` (seeder
inserts-only, never overwrites existing rows) and is also cached live in three DB
places that must be patched directly for existing companies: `pta_compliances`
(template), `compliance_rule` (per-project live rows), and the dashboard
`compliance_of_projects.pta_compliances` jsonb. Apply to dev AND prod. The
separate `compliance_checks.content` guidance ("earlier of contract period or 15
business days") is legally accurate (schedule-giving deadline) — leave it.
