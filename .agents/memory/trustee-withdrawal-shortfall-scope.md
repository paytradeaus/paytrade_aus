---
name: Trustee withdrawal shortfall scope
description: Why the account-level trustee-withdrawal shortfall warning aggregates claims across all projects while the Check 7 compliance engine sums per project.
---

# Trustee withdrawal shortfall — scope difference is intentional

The BIF "Payments to yourself as trustee" (Check 7) shortfall has two surfaces that
compute "total outstanding claims" at **different scopes**, on purpose:

- **Check 7 compliance engine** (pta-functions.ts) runs **per project** — it sums
  `claim_amount` for a single `project_id` and compares against the trust account's
  current balance. Rule 5 (red FAILED) only escalates when an actual non-deleted
  `Withdrawal` payment exists `payment_from_account = PTA AND project_id`; otherwise
  it emits the non-failing amber Rule 8.
- **`computeTrusteeWithdrawalShortfall` helper** (manual Withdrawal popup + Xero
  inbound trust-movement advisory note) runs at the **account level** — a trustee
  withdrawal is drawn from the *account*, with no single-project context, so it
  aggregates claims across **every** project the account serves, using the same
  canonical reverse link the engine joins on: `bank_accounts.project_ids`
  (`project_id = ANY(string_to_array(ba.project_ids, ',')::int[])`).

**Why:** there is no per-project context at a trustee withdrawal site, so the only
sensible "total outstanding claims" is the aggregate the user asked for. For a
single-project trust account the two scopes are identical; for a multi-project
trust account the aggregate can only warn MORE than any per-project compliance
check, never less — the safe direction for a non-blocking nudge.

**How to apply:** keep `SETTLED_CLAIM_STATUSES` and the `cash_retention_type='Claim'`
filter in lockstep between the helper and pta-functions. Do NOT "fix" the helper to
match per-project scope — that's not possible without a project context and would
make it under-warn on multi-project accounts. If you ever need them to truly agree,
the change belongs in the compliance engine (core logic) and needs user sign-off.
