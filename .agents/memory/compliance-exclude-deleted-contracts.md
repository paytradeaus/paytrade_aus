---
name: Compliance contract checks must exclude Deleted contracts
description: Why compliance contract-presence/eligibility queries must filter out contract_status='Deleted' before emitting an action-button reference_id or summing values.
---

# Compliance contract queries must exclude Deleted contracts

Compliance checks in `pta-functions.ts` / `rta-functions.ts` fetch contracts by
`where: { project_id }` and then either (a) pick the first attachment-less
contract and emit its UUID `id` as an `EDIT_CONTRACT` action-button
`reference_id`, or (b) sum `initial_contract_sum` for eligibility thresholds.

**Rule:** any such query must add `contract_status: Not('Deleted')` (import `Not`
from `typeorm`).

**Why:** A deleted contract with no PDF attachment was selected as the
"missing contract" for PTA Check 6 Rule 8, so the "Go to Contract" / EDIT_CONTRACT
deep-link opened an edit form for a *deleted* contract and populated the wrong
supplier details. Including deleted contracts in eligibility sums likewise
overstates totals and can misclassify pass/fail.

**How to apply:**
- The attachment-less-contract picker (PTA Check 6 Rule 8) is the confirmed
  bug; fixed by excluding Deleted from its `presenceOfContracts` find.
- Sibling sum queries (PTA Head-Contractor sums, RTA contract finds) share the
  same omission. Excluding Deleted there changes compliance threshold math, so
  treat it as a business-logic decision and confirm before changing.
- After a code fix, the compliance cache (`compliance_rule` rows written by the
  refresh job) still holds the stale FAILED row pointing at the deleted
  contract until the next refresh recomputes it.
