---
name: Compliance checkpoint freshness flag
description: Every successful compliance resync must clear is_stale on the saved checkpoint, including the no-change branch; the entity default is true so omitting it creates an infinite refresh loop.
---

The `compliance_checkpoint` row defaults `is_stale = true` at the column level. The refresh consumer (`ComplianceRefreshConsumer.process`) counts `is_stale = true` rows after a refresh and, if any remain, enqueues a follow-up job with a unique (un-dedupable) jobId. Any code path that finishes a successful resync but leaves `is_stale = true` therefore creates a tight self-perpetuating loop — observed as ~18 PTA/RTA function log lines per second for the same project, indefinitely.

**Rule:** Every successful `syncCompliancesOfProject` exit must set `is_stale = false` and stamp `last_synced_at = now()` on the affected row(s). This applies to:
- The "hasChanges → new ComplianceCheckpoint" branch (must set the flag on the new entity *before* save, because `new ComplianceCheckpoint()` inherits the entity default `true`).
- The "no changes detected, skipping update" branch (must `update()` the existing row if its flag is still true — skipping the write does not clear the flag the producer set when marking dirty).
- The synthetic "no active rules" branch (already does this correctly).

**Why:** The orphan-cleanup query in `refreshProjectComplianceCache` deliberately excludes attempted (bank_account_type, check_number) pairs from the blanket `is_stale = false` update — its job is only to clear rows for checks that no longer exist in `compliance_checks`. So if `syncCompliancesOfProject` doesn't clear the flag itself, nothing else will, and the consumer's race-recovery path (`stillDirty > 0 → enqueueFollowUp`) becomes a permanent re-trigger.

**How to apply:** When editing `syncCompliancesOfProject` or adding any new branch that creates/updates a `ComplianceCheckpoint`, set both `is_stale` and `last_synced_at` explicitly. Do not rely on `saveFullComplianceData` to do it for you — that path runs from `getComplianceData`, not from the refresh worker. Also never log normal success as `logger.error` (the old "Compliances of a project updated" line) — it pollutes ERROR-filtered observability.
