---
name: Sync-log resolve mutations need company scoping
description: Any mutation that resolves/archives a xero_sync_logs row by UUID must verify the log's company against headers.companyid
---
The rule: a GraphQL mutation that takes a `sync_log_id` (uuid) and mutates state (link/dismiss/archive/re-trigger) must pass the caller's `headers.companyid` down to the service and reject when the log's integration → `xero_integration_details.company_id` doesn't match.

**Why:** sync-log UUIDs are guessable/shareable across sessions; `decodeJwtToken` validates the header company against the JWT's roles but does NOT tie the target record to it. Architect review caught a cross-company link/dismiss hole in the credit-note refund resolve lane; the older trust-movement resolve lane has the same shape.

**How to apply:** copy the `manualXeroTwoSidedSync` resolver pattern — read `context.req.headers.companyid`, reject if absent, pass `company_id` into the service, and compare against the integration row resolved from the log before any write.
