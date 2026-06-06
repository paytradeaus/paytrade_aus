---
name: Compliance payment checks must exclude Deleted payments
description: Why PTA/RTA compliance queries over payment_details must filter current_status != 'Deleted', and how a deleted+replaced payment's stale sub-payment causes a false late-deposit FAIL.
---

# Compliance payment checks must exclude Deleted payments

Compliance checks that gather payments from `payment_details` (mapped by the
`Payments` entity) and then derive `sub_payments` from them must filter
`current_status != 'Deleted'`.

**Why:** A `payment_details` row that is deleted and re-recorded keeps its old
`sub_payments` rows (sub-payments are not cascade-deleted). The PTA "Payments
from the principal" check (pta-functions.ts `paymentsFromThePrincipal`, Check 5
rule 6) flags a receivable sub-payment as "late / not recorded in the trust
journal within 3 business days" when it is older than 3 business days and
`!is_received_confirmed && !is_paid_confirmed`. The deleted payment's stale
unconfirmed sub-payment satisfies that — so a project whose *live* replacement
deposit is already confirmed/matched still shows a false FAILED, with a
VIEW_PAYMENTS button whose reference_id is the deleted payment's sub_payment_id
(landing on an empty "Payments to do" page).

**How to apply:** add `.andWhere("p.current_status != 'Deleted'")` to the
receivable/payment-fetch query *before* its `paymentIds` map feeds the
sub-payments query — this excludes deleted payments from every downstream branch
at once. `paymentsToSubcontractors` (Check 6) already does this; keep sibling
payment-based checks consistent.

**Aftermath:** the stale `compliance_rule` cache row persists until the
compliance refresh recomputes the project (post-deploy). The fix is code-only;
no migration needed.
