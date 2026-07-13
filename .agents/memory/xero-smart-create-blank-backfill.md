---
name: Xero smart-create blank-only contact backfill
description: Contact-completeness gates in the inbound smart-create pipeline must backfill blank PT fields from the live Xero contact before failing.
---

The rule: any inbound Xero validation that hard-fails on missing PayTrade contact fields (address/email) must first attempt a blank-only backfill from the live Xero contact — the pipeline already fetched (or can fetch via the ACTIVE mirror row) the full contact, so failing and telling the user to re-type data Xero already sent is a self-inflicted failure class.

**Why:** Real prod incident — a user hand-created a blank PT contact to unblock a failed bill import; smart contact auto-create same-name-mapped it (the mapped-to-existing branch copies nothing across), then smart contract creation hard-failed on "missing Address, Email" even though the live Xero contact held both. Bank details WERE already auto-imported from the same live read, so the gap was inconsistent, not principled.

**How to apply:**
- Blank-fill ONLY — never overwrite anything typed in PayTrade. `client_email_id` is NOT NULL: only assign when the incoming email is truthy.
- Use the shared `xero-address.util.ts` (`pickXeroAddress` POBOX→STREET→first + `composeXeroAddress` flatten-to-one-varchar) — do not re-implement selection/flattening.
- Persist via direct repository update, not the contact edit service (which can push back to Xero and echo); values just came FROM Xero.
- Mutate the in-memory contact object after the DB update so the immediately-following validation sees the filled values.
- Both gates need it: the same-name auto-map branch in `smartCreateContactFromInvoice` AND the completeness check in `smartCreateContract`. Wrap in try/catch so a failed backfill degrades to the old failure, never a crash.
