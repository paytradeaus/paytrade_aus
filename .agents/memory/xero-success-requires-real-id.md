---
name: Xero "Export successful" must require a real Xero ID
description: Any Xero outbound sync that logs "Export successful" must first verify the response carries the entity's Xero ID; null-ID responses produce phantom mirrors that fail on later sync.
---

# Rule

When writing/extending Xero outbound sync code (createTrackingOptions,
createContact, createInvoice, etc.), **do not log an "Export successful"
sync_log entry, and do not save the local Xero-mirror row, unless the
Xero API response carries the entity's real ID** (trackingOptionID,
ContactID, InvoiceID, etc.). A truthy response body is not enough — Xero
can return an object that looks like a success but is missing the ID.

# Why

A real incident on integration 1007: `createTrackingOptions` returned a
body where `options[0]` had `{ name, status }` but no `trackingOptionID`.
The code only checked `options[0] !== null`, so it:

1. Wrote a `xero_contract_details` mirror row with `contract_id = NULL`.
2. Wrote a tpl-12 "Export successful" sync log.
3. Six hours later, the contract was deleted in PT, the delete sync
   looked up the (null) tracking option in Xero, didn't find it, and
   logged a tpl-293 "Delete contract in xero failed — contract is not
   found" failure that confused the user.

All 4 contract mirrors on that tenant were affected; the parallel tenant
on a clean code path had 4/4 real IDs. So the bug is per-tenant and
reproducible whenever Xero returns an ID-less option element.

# How to apply

- Every guard that gates "success" path on a Xero response must inspect
  the ID field directly, not just the existence of an array element.
  Example (correct): `if (resp?.body?.options?.[0]?.trackingOptionID)`.
  Example (wrong): `if (resp?.body?.options[0] !== null)`.
- When falling through on a missing ID, route to the existing failure
  log path (do not invent a new one). The mirror row must not be
  written; the sync log must be a failure with a meaningful error.
- Pair this with idempotent-delete behaviour at the other end: a Xero
  DELETE that 404s should be treated as success (the desired end state
  is already true), not a failure.
- When auditing for this class of bug across services, query the
  mirror table for `xero_id_column IS NULL` rows grouped by
  `integration_id` — any tenant with a non-trivial count is suspect.
- **Generalised rule (from the createPayment incident):** when a write
  response embeds the *affected* object (the invoice on a payment
  response, the contact on an attachment response, etc.), validate the
  affected object's post-mutation state — not just the action object.
  `createPayment` returns `payments[0].invoice` with the bill's new
  `amountDue` / `status` / `amountPaid`; if Xero accepted the payment
  but the bill's `amountDue` did not drop by the payment amount, the
  payment didn't apply. Reading those fields is free (already in the
  response body) and catches a class of silent failures that no amount
  of action-object validation can. See
  `docs/architecture/xero-payment-response-validation.md` for the
  concrete implementation.
