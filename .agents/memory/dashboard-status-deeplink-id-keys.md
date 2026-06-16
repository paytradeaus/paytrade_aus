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
