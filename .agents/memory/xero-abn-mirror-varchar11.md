---
name: Xero taxNumber → PT abn_number overflow
description: Why every Xero taxNumber → PayTrade abn_number mirror must strip whitespace and cap to 11 chars.
---

# Xero ABN mirror overflows PT abn_number(varchar(11))

PayTrade's `client_suppliers_details.abn_number` is **varchar(11)** (ABNs are 11 digits). Xero stores the same value in `Contact.taxNumber` but almost always **space-formatted** — e.g. `53 004 085 616` = **14 chars**.

**Rule:** any path that mirrors Xero `taxNumber` onto PT `abn_number` MUST normalise with `taxNumber.replace(/\s+/g,'').slice(0,11)` before the DB write. A raw `.trim()` overflows the column.

**Why:** a space-formatted ABN overflowing varchar(11) makes the contact `.save()` throw. Inside the inbound contact handler that throw rolls up through `editClientSuppliersDetailsById` (which re-throws) into the contact handler's catch — so the *entire* address/email/phone update silently fails, not just the ABN. This is the class of bug behind "Manual Xero re-sync didn't update the contact's address."

**How to apply:** there are multiple mirror sites that must stay in sync — the webhook/manual update path, the inbound create payload builder, AND the one-shot backfill job. Fix all of them, not just the one in front of you. The reverse direction (PT abn_number → Xero taxNumber) has no length constraint and needs no capping.

# Contact handler failure contract

`handleContactCreateUpdate` must **`return false` on every failure/catch exit** and **persist a Failed sync log** for non-auth errors (don't console-only). Callers (manual re-sync) gate on a falsy result, and the manual-sync UI says "check the entries that follow" — if no detail log is written, the failure is undiagnosable. Auth/refresh-token errors already log; the non-auth branch did not until this was added.
