---
name: Xero sync-log noise — three layers + supersede
description: How xero_sync_logs avoids a permanent trail of stale failure breadcrumbs, and the guardrails that stop over-archiving.
---

There are THREE distinct layers that keep `xero_sync_logs` from piling up, all centered in `insertXeroSyncLogs`. Know which one applies before touching any of them:

1. **Dedup-merge (same reason repeats):** an incoming Failed row that matches an active row by reference_id / resource_key / md5(dynamic_values) within the same template (+ its `associated_log_ids`) does NOT create a new row — it bumps `dynamic_values.occurrence_count` / `last_occurred_at`. This is the anti-flood for webhook + ~15min scheduler redelivery.

2. **Success-archive (`autoArchivePriorFailedLogs`):** when a Succeeded row lands, archive prior active Failed rows for the same resource, scoped by the success template's `associated_log_ids` linkage.

3. **Moderate supersede (`autoArchiveSupersededFailedLogs`):** when a FRESH Failed row is persisted (allowCreation=true ⇒ the dedup gate did NOT collapse it ⇒ a genuinely NEW reason for the same record), archive prior active Failed rows for the SAME resource on the SAME pipeline whose template differs. Example it fixes: inbound bill import 265 "contact not mapped" → 486 "contact missing email+bank details" left 265 active forever.

**Guardrails shared by layers 2 & 3 (do not weaken):**
- Archive, never delete — stamp `archive_note`; rows stay visible under the Archived filter.
- `XeroService.FORBIDDEN_AUTO_ARCHIVE_TEMPLATES` (delete-intent / edit-not-found / subscription-gate templates) is NEVER auto-archived — those clear only via their own resolution path.
- Resource key = `COALESCE(invoice_id, contact_id, account_id, bank_transfer_id, payment_id)`. Inbound bill logs (265/425/486) all key on `invoice_id`, so they collapse together; contact-level logs key on `contact_id` and stay independently fixable.
- Layer 3 additionally requires `from_xero = true` on BOTH the new and prior template, so an inbound import failure never archives an OUTBOUND push failure that happens to share the same resource id (different pipeline).

**Why:** the gap was real — progression to a different template is the one case the dedup gate cannot catch (different message ⇒ must NOT merge), and a blind "archive anything sharing this resource id" would wipe outbound failures and user-intent holds. Layer 3 is wired into the INSERT branch only (the new-row case); the UPDATE branch already self-heals on Succeeded.

**How to apply:** when adding a new inbound failure template, it auto-participates in layer 3 as long as it's `from_xero=true` + `sync_status='Failed'` and not on the FORBIDDEN list. If a new template should NOT be auto-superseded (user-intent/gate), add it to `FORBIDDEN_AUTO_ARCHIVE_TEMPLATES`.
