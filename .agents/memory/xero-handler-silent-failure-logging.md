---
name: Xero invoice handler silent-failure logging
description: Why handleInvoiceCreateUpdate must persist a sync-log on every non-true return, or manual two-sided sync trigger rows point at nothing
---

# Xero invoice handler must log on EVERY failure path

`handleInvoiceCreateUpdate` (webhook.service.ts) is invoked by the manual
two-sided sync. The caller treats any return value that isn't strictly `true`
as failure and writes a "...handler reported a processing failure. Check the
sync log entries that follow this trigger row for details." trigger row — it
does NOT write the diagnostic itself; it relies on the handler having persisted
its own `xero_sync_logs` row.

**Rule:** every non-`true` return path in the handler (and similar webhook
handlers) MUST persist a Failed `xero_sync_logs` row, or the manual-sync trigger
points at nothing and the failure is undiagnosable.

**Why:** the catch block historically only wrote a sync-log when the error was a
refresh-token error (`refreshTokenReAuthenticate`). Any OTHER thrown exception
was sent to the app logger only, and the function fell through returning
`undefined`. Deployment debug logs (`[BILL_TRACE]`) are not retained long, so
once they rotate the only record is the trigger row that says "see the rows that
follow" — with no following rows, leaving the failure undiagnosable.

**How to apply:**
- Catch block: for non-refresh-token errors, persist template 636 (webhook) /
  637 (non-webhook = manual/scheduler) carrying the real error message, then
  `return false` explicitly. Never let the function fall through to `undefined`.
- Early guards that already have `integration_id` (e.g. integration-not-
  processable) must also persist a Failed row. The no-integration guard cannot
  (the row FKs on `integration_id`) — logger-only is unavoidable there.
- Note the data-layer cause separate from the logging gap: an `ACCREC` invoice
  needs its contact mapped as a **Client**; if Xero has the contact as a
  **Supplier**, auto-create (`smartCreateContract`) refuses it, `pt_contact_id`
  stays blank, and every sync dead-ends on "Contact details not mapped"
  (template 425/265).
