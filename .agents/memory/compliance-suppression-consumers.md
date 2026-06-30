---
name: Compliance suppression must cover all consumers
description: Pausing/suppressing a project's compliance has multiple independent read paths that each need a guard.
---

When you add a feature that suppresses/zeroes a project's compliance state (e.g. manual "pause compliance"), guarding the recompute path alone is NOT enough. Compliance failures surface through several independent consumers that each read different storage:

- **Live dashboard count** — `fetchComplianceStatusesOfAProject` (compliances.service.ts) computes issues on the fly; the dashboard "Compliance to do" calls it per project.
- **AI status-snapshot system issues** — `ai-status-snapshot/checkers/compliance.checker.ts` reads the `compliance_of_projects` jsonb directly and emits `StatusIssue` rows. It does NOT call the service, so a service-side short-circuit does not cover it. Filter paused/suppressed projects out of its `activeProjects` set (select `compliance_paused` in its `projectRepo.find`).
- **Emails** — daily digest (`checkAllprojectCompliance`) and per-project mail (`collectFailedComplianceDataForProject`, `sentMailsOnFailedComplianceOfAProject`).
- **Recompute/snapshot** — `refreshProjectComplianceCache` (BullMQ worker, read-time safety net, manual refresh button all funnel here).

**Why:** the snapshot jsonb is written by the recompute path but read by both the dashboard projection (see compliance-dashboard-jsonb-lockstep) AND the status-snapshot checker; suppressing one read path silently leaves the other firing.

**How to apply:** when pausing, also clear `is_stale` on checkpoints (entity default is `true`, else the freshness worker loops — see compliance-checkpoint-freshness). On resume, re-run `refreshProjectComplianceCache` to rebuild everything.
