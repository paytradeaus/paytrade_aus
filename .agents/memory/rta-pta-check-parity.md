---
name: RTA/PTA compliance checks are near-duplicate twins
description: Monthly-reconciliation (RTA check 9 / PTA check 8) and other checks exist in both rta-functions.ts and pta-functions.ts; fixes must be ported to both.
---
- **Rule:** any logic fix to a compliance check must be applied to BOTH the RTA and PTA variants — they are copy-paste twins, not shared code.
- **Why:** the "reconcile required" false-fail (measuring 15 business days from the latest report's own month-end instead of the most recently *ended* month) was fixed in PTA check 8 but left in RTA check 9, so compliant customers false-fired on RTA from ~day 21 of each month until the next month's not-yet-due reconciliation.
- **How to apply:** correct pattern = anchor to last ended month; pass if a Balanced Active report covers last month, or (within a 15-business-day grace window after last month-end) the month before; order reports by month_end_date DESC, never created_on.
