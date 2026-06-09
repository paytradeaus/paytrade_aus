---
name: Xero inbound contact email NOT NULL
description: Xero sends emailAddress as "" (or absent); client_suppliers_details.client_email_id is NOT NULL — coerce with || '' on every inbound insert.
---

# Xero inbound contact email must coerce to '' not null

Xero contacts frequently have `emailAddress: ""` (empty string) — and the field can be absent entirely. The PayTrade column `client_suppliers_details.client_email_id` is **NOT NULL** (dev + prod).

**Rule:** every inbound Xero→PT contact insert/payload that sets `client_email_id` must use `contact.emailAddress || ''`, never `|| null`. A single `|| null` site throws a not-null violation that bubbles to the invoice/bill webhook top-level catch and surfaces as the misleading "Invoice/bill webhook processing failed unexpectedly".

**Why:** smart-create-from-invoice (and the contact webhook) build the contact payload from the live Xero contact. Missing email is a *soft* fail in PT (contact still imports, flagged `needs_email=t`) — so a hard DB crash on null email is always a bug, not intended gating.

**How to apply:** when adding any new contact-creation path, grep `client_email_id: contact.emailAddress` and confirm `|| ''`. The downstream "missing email + no bank details" hold is a *separate, by-design* data-completeness gate (sync-log template 486) the user resolves by filling those fields in PT and retrying — do not "fix" it in code.

**Self-heal note:** right after a Railway redeploy, smart-create can transiently return 265 ("contact not mapped") if the live Xero contact fetch hiccups (token refresh / 403); the ~15-min scheduler fallback re-runs and completes the auto-create. A lone 265 immediately post-deploy is often transient, not a logic bug — check whether the mirror later got `pt_contact_id` set before assuming a code fault.
