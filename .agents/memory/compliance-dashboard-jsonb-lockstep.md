---
name: Compliance dashboard jsonb vs live tables lockstep
description: The dashboard System Status card reads a separate jsonb snapshot, not the live compliance tables; keep the two recompute paths in sync.
---

# Two compliance recompute paths, two storage targets

There are TWO places compliance results land, and TWO code paths that recompute them:

- Live tables: `compliance_checkpoint` + `compliance_rule` (per-check / per-rule).
- Dashboard snapshot: `compliance_of_projects` jsonb columns `pta_compliances` / `rta_compliances`.

Path A (canonical, inline activity + daily 08:00 cron): `fetchComplianceResultsOfAProject` writes BOTH — live tables via `saveFullComplianceData` AND the jsonb via `saveComplianceData`.

Path B (freshness worker): `markComplianceDirty` → debounced BullMQ worker → `refreshProjectComplianceCache` → `syncCompliancesOfProject` writes ONLY the live tables. It does NOT touch the jsonb.

**Why this matters:** the dashboard "System Status" card (`ai-status-snapshot/checkers/compliance.checker.ts`) reads ONLY the jsonb and surfaces entries with `check_status === 'FAILED'`. So any resolution that flows through Path B updated the live tables but left the dashboard showing the old FAILED state until the next daily cron — a confusing multi-hour lag.

**The rule:** whenever the live compliance tables are recomputed outside Path A, the jsonb snapshot MUST be re-projected from them. The fix is a pure projection `syncComplianceDashboardSnapshotFromCheckpoints(projectId)` — reads the already-fresh checkpoints/rules and feeds them through the existing `saveComplianceData` writer — called at the END of `refreshProjectComplianceCache` (the single funnel for the worker, the manual "Refresh now" mutation, and the read-time safety net). It deliberately does NOT recompute and does NOT write `is_stale` / `last_synced_at`, so it can't disturb the Task #297 freshness invariants or the worker's stillDirty race-recovery.

**How to apply:** if you add another path that writes the live compliance tables, project it to the jsonb too (or route it through `refreshProjectComplianceCache`). Don't assume writing checkpoints updates the dashboard.

# "Not carried out" placeholder checks live ONLY in the jsonb

`saveFullComplianceData` filters out items whose rules all have null `rule_number` (`results.every(r => r.rule_number != null)`), so "Pay Trade does not carry out this check" placeholder checks (null rule_number, no `check_status`) are NEVER persisted to the live tables — they exist only in the jsonb (written by `saveComplianceData`, which has no such filter).

Consequence: a projection from live tables drops those placeholders from the jsonb. That is safe because the only jsonb consumers are (a) the dashboard checker (filters FAILED; placeholders have no status) and (b) two in-service readers (mail sender + `getComplianceData`) that use the jsonb purely as a per-check `mails`-flag membership lookup for check_numbers that are FAILED in a fresh `fetchComplianceResultsOfAProject(failedFilter:true)` — placeholders are never in that set. The frontend never reads the jsonb directly.

# Known pre-existing risk (not fixed here)

`saveComplianceData` finds the existing row via `pta_compliances: Not(IsNull())` / `rta_compliances: Not(IsNull())` rather than by `project_id`, so a PTA-then-RTA sequence on a project with no prior row can create TWO `compliance_of_projects` rows. The checker's `getMany()` would then double-count issues. Pre-existing; projecting more often raises its frequency. Harden to single-row-per-project (lookup/update by `project_id`) if it surfaces.
