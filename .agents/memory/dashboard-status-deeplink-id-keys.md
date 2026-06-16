---
name: Dashboard System Status deep-link id keys
description: ai-status-snapshot checkers must emit the id the view page actually fetches by (uuid PK), not the int business key.
---

# Dashboard "System Status Summary" deep-link id keys

The dashboard status-snapshot checkers (`back-end/.../ai-status-snapshot/checkers/*.checker.ts`)
emit `affectedRecordType` + `affectedRecordId`. The frontend `resolveStatusIssueRoute`
(UserDashboard.tsx) builds a deep-link URL from those. The link only opens the right
record if `affectedRecordId` is the **same key the target view page fetches by**.

**Rule:** several PayTrade entities have BOTH a uuid `id` PK and a separate integer
business key (`report_id`, `client_supplier_id`, ...). The detail/view pages fetch by the
uuid `id` (e.g. `viewClientSuppliersDetails(id: String!)`, reconciliation record view by
uuid), and the existing list "View" actions pass `row.id` (the uuid). So checkers MUST
emit `r.id`, not the int business key — emitting the int silently opens the wrong/blank
record. Keep the human-readable int in the `StatusIssue.id` string field, separate from
`affectedRecordId`.

**Also:** the StatusIssue/GraphQL snapshot carries a single `affectedRecordId` (String-cast).
Deep-links that need a second param (e.g. claim id for a payment) must work from that one
id alone — the AddPayment VIEW mode fetches by `payment_id` only and derives claim id from
the fetched patchData, so no second param is needed.

**Verify-before-trusting:** `rg`/explore obfuscate identifiers in this repo (show `n`/`ln`);
confirm the view page's fetch key with the `read` tool / plain `grep` before changing a
checker's emitted id.

## Checkers must exclude deleted/archived + non-actionable rows

Every status-snapshot checker MUST filter out deleted/archived records, or the dashboard
surfaces voided items whose deep-link opens a dead record. The canonical payment filter is
`pd.current_status NOT IN ('Deleted','Archived')` (current_status is non-nullable, so NOT IN
is safe). Other entities use their own status: claims `status NOT IN ('Archived','Deleted',…)`,
reconciliation `report_status='Active'`, contracts/compliance via project/contract status.

Also exclude rows the user **cannot act on**: bank/trust money-movement payment types
(Withdrawal, Top Up, Top Up Retention, Inter Trust Transfer, Interest Received/Withdrawal,
Bank Charge Applied/Top Up) have NO per-leg confirm checkbox, so an unconfirmed leg on them
can never be cleared — exclude them from "Payment leg awaiting confirmation". They auto-match
so they never legitimately fire anyway. `payment_type` is nullable: use
`(pd.payment_type IS NULL OR pd.payment_type NOT IN (...))` to keep NULL-type legs eligible.

The contacts `needs_email` flag (set at Xero import) goes **stale** once a user adds an email
later — never gate the "missing email" issue on `needs_email` alone; gate on the actual value
being empty: `(client_email_id IS NULL OR TRIM(client_email_id) = '')`.
