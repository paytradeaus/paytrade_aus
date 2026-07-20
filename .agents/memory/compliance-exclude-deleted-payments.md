---
name: Compliance checks must exclude Deleted records (payments, claims, contracts, sub-payments)
description: Every PTA/RTA compliance query over a soft-deletable entity must exclude its 'Deleted' status, or a deleted+replaced record causes a false compliance result. RTA originally had ZERO such filters.
---

# Compliance checks must exclude Deleted records

Records are soft-deleted via a status column, never row-deleted. Every compliance
query that reads one of these must exclude the deleted state:
- `contract_details.contract_status != 'Deleted'` (enum; use `Not('Deleted') as any` in a where-object)
- `payment_claims.status != 'Deleted'`
- `payment_details.current_status != 'Deleted'`
- `sub_payments`: filter the JOINED parent payment (`pd.current_status != 'Deleted'`) — sub-payments are NOT cascade-deleted, so a deleted parent leaves stale sub-rows.

**Why (broad):** A deleted+replaced record keeps its children/old rows. Any
"presence" check (does a retention contract/claim/payment exist?), SUM
(eligibility totals over `initial_contract_sum`), or COUNT/late check over those
children will count the dead record and produce a false PASS/FAIL. The whole
`rta-functions.ts` (Retention Trust Account checks 1/2/3/5/6/8) originally had
NO deleted filters at all and was swept to add them; `pta-functions.ts` is the
reference pattern (its payment guards were added incrementally).

## Original concrete case (PTA Check 5 rule 6)

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

**Recurrence (Check 7 rule 6):** the same defect fired again in
`paymentsToYourselfAsTrustee` (trustee 3-business-day journal check) — its
payments query had no Deleted guard, so deleted+re-recorded deposits produced
an ACTION REQUIRED whose View Payments page was empty. Guard added; all three
`businessDays: 3` late checks (Checks 5/6/7) are now filtered. NULL confirm
flags count as unconfirmed (JS falsy check), so stale rows always qualify.

**Aftermath:** the stale `compliance_rule` cache row persists until the
compliance refresh recomputes the project (post-deploy). The fix is code-only;
no migration needed.
