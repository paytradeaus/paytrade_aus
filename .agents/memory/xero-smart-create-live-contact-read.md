---
name: Xero smart-create depends on a single live getContact
description: Why the inbound smart-create contact read must retry transient failures instead of hard-failing.
---

Inbound Xero→PT smart-create (`smartCreateContactFromInvoice`) needs the contact's
Address / Country / Phone (and ABN) to pass the webhook mandatory-field check
(`collectMissingMandatoryFields({ webhookSource: true })` requires Name, Type,
Status, Address, Country, Phone; email is the only soft-fail). The synced
`xero_contact_details` mirror only stores name/type/status — NOT address/phone/ABN —
so **mirror-fallback is not viable**; the live `getContact` is the only source of
the full payload.

**Rule:** A transient `getContact` failure (HTTP 200 with an empty `contacts`
array, or a thrown 429/5xx) must be retried, not turned straight into a terminal
"Contact details not mapped" (265/425) hard-fail. The whole bill/invoice import is
stranded on this one read.

**Why:** An incident showed a webhook fail 265 at read time while a live probe
hours later returned the same contact ACTIVE with full address+ABN — i.e. the
failure was transient, but the code converted it into a permanent dead-end
requiring manual intervention (and the manual-retry resolver path does NOT
re-run smart-create, so the user's retry also failed).

**How to apply:** read through `fetchXeroContactWithRetry` (retries on both throw
and empty result, short backoff, returns contact|null). Only return
`'failed_generic'` (→ generic 264/265/424/425 terminal log) after retries are
exhausted — genuine "contact truly unfetchable" still fails terminally. Don't try
to satisfy the import from the mirror alone; it lacks the mandatory address/phone.
