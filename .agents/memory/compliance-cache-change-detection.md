---
name: Compliance cache change-detection must compare the action target (reference_id)
description: Why fixes that only change WHICH record a compliance rule points at silently no-op unless reference_id is in syncCompliancesOfProject's hasChanges diff.
---

# Compliance cache change-detection must include reference_id

`syncCompliancesOfProject` (compliances.service.ts) recomputes a check, then
compares the fresh result against the cached `compliance_checkpoint` /
`compliance_rule` rows via a `hasChanges` OR-chain. If `hasChanges` is false it
takes a no-op branch and leaves the cached rows untouched.

**Rule:** any field the UI consumes from the cached rule — especially
`reference_id` (the action-button target, e.g. the EDIT_CONTRACT deep-link
contract UUID) — MUST be in the `hasChanges` comparison. It originally compared
only check_name / check_status / action_button_type / colour / display_message /
content.

**Why:** A fix excluding `Not('Deleted')` contracts from PTA Check 6 Rule 8
re-pointed the issue from a deleted contract to a live one, but status/message
stayed identical, so `hasChanges` was false and the stale deleted-contract
`reference_id` was never overwritten. "Go to Contract" kept opening the deleted
contract — defeating two separate fix attempts. Symptom signature: cached row's
`reference_id` AND `compliance_checkpoint.last_synced_at` both frozen even after
a manual Refresh that reports success.

**How to apply:**
- A target-only change (same status, different `reference_id`) is a real change.
- Normalize with `(x || null)` to match the write path (`reference_id || null`)
  and avoid null/undefined false positives. Watch number-vs-string churn if any
  producer emits a numeric reference_id (PTA contract path emits strings).
- Cache is per-check; a code fix only takes effect on the NEXT recompute that
  detects a change, and only once the build is actually deployed (prod = Railway,
  separate deploy from dev).
