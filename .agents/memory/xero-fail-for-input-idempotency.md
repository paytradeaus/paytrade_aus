---
name: Xero fail-for-input holds must be idempotent across webhook + scheduler
description: Why a "needs your input" sync-log hold duplicates every 15 min and how to prevent it
---

Inbound Xero handlers re-run on BOTH the webhook delivery AND the scheduled
fallback poll (~15 min). Any handler that writes a "fail-for-input" hold
(sync_status Failed + information_required, return false) WITHOUT first checking
for an existing open hold will stamp a brand-new hold row on every poll. One
un-actioned item => ~96 duplicate "needs your input" rows/day.

**Rule:** before inserting a fail-for-input hold, query for an existing
non-archived log of the SAME template + integration_id keyed on the stable
external id (e.g. `reference ->> 'xeroId' = <resource_id>`). If one exists, skip
the insert and return — the resolve/apply mutation is what clears it.

**Why:** trust-movement classification (template 632) duplicated 12x for a single
$1.24M PTA→Cash withdrawal because the classify branch had no such guard. The
resolved/vanished sibling stopped at 2 rows — the tell that duplication only
continues while the hold stays open.

**How to apply:** applies to every classify/await-input branch, not just trust
movements. The guard must match the field the writer reliably sets — here every
632 row sets `reference: { xeroId: bank_transfer_id }`, so that's the join key.
Cleanup of an existing duplicate backlog: keep the latest per external id, archive
the rest (`archived_at`), and the guard then sees the survivor and stops new dupes
post-deploy.
