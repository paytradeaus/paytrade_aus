---
name: Xero sync logs must capture the response, not the request
description: On a Pay Trade → Xero "Export successful" sync log, xero_records must contain the actual Xero response body, never the request payload, or the silent-success class of bug is undiagnosable.
---

# Rule

When writing/extending a Pay Trade → Xero outbound sync log, the
`xero_records` column on the success path must store the actual Xero
response entities (e.g. `response.body.payments`,
`response.body.bankTransfers`, `response.body.invoices`). It must NOT
store the request payload object we sent.

# Why

A real incident on company_id 1012: `createPayment` was writing
`xero_records: [payment]` on template 168 ("Export successful") — where
`payment` is the request we built (invoice GUID, account GUID, amount,
date). When 5 ABA-marked bills came back showing as "Export successful"
in Pay Trade but unpaid in Xero, the sync logs offered no forensic
evidence at all: every success log just echoed the request back. We
could not tell from the logs whether Xero had:

- returned an ID-less / validation-error response we mis-read as success,
- returned a real paymentID attached to the wrong invoice,
- returned DELETED / VOIDED status,
- or actually succeeded and something downstream tampered with it.

The diagnosis required reconciling against live Xero state and the
production backend logs. If the success log had stored the response we
would have seen the cause in 30 seconds.

# How to apply

- Every Xero outbound sync log on the success path should set
  `xero_records: response?.body?.<entityArray>` (the array, not just
  index 0 — Xero can bulk-create and return multiple).
- Pair with the
  [Xero "Export successful" must require a real Xero ID](xero-success-requires-real-id.md)
  rule: validate the response carries a real ID before logging success
  at all.
- On Failed paths, also store the raw Xero body in `xero_records` so
  support can see why Xero rejected it without re-fetching.
- When reviewing existing outbound code, grep for
  `xero_records: \[.*\b(payment|invoice|contact|bankTransfer|tracking)\b.*\]`
  to find places that still echo the request payload — these are all
  candidates for the same silent-success class of bug.
