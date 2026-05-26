# Sync Status Summary — Classification Rules

The dashboard's **System Status Summary** card pulls Xero sync failures via
`SyncChecker` (`back-end/src/api/users/ai-status-snapshot/checkers/sync.checker.ts`).
That checker decides, per row, whether a Failed Xero sync log shows up as
**Critical** (needs the user's attention now), or **Info** (background noise
the system is retrying / has already mitigated).

This page documents the rule set so future tweaks land in one place.

## TL;DR

- **Critical** = the failure blocks money movement, a user-initiated
  action, or compliance.
- **Info** = the system is retrying on its own, or the failure is
  metadata-only / on an archived or never-imported record.
- Severity is decided per-row, in code, on every snapshot fetch — the
  423 Failed template seed rows are NOT edited. This keeps the contract
  with Xero log templates stable while still letting us re-tune the card
  without a data migration.

## Severity rules (in order)

1. **Trust the Task #274 downgrade flag.** If `dynamic_values.downgrade_reason`
   is set, the contact-mirror interceptor already decided this row is
   noise (archived contact, dormant 12mo, or never imported). → `info`.
2. **Retry-noise `sync_type`s.** Schedulers and webhook re-receives are
   automatic retry loops; one-off failures aren't user-actionable until
   they persist (and when they do, the downstream push will surface as
   Critical on its own). → `info`.
   - `Invoice webhook`, `Contact webhook`
   - `Invoice schedulers`, `Project schedulers`, `Contract schedulers`,
     `Account schedulers`, `Contact schedulers`, `Overpayment schedulers`
3. **Noise `error_code` prefixes.** Regardless of `sync_type`:
   - `SCHEDULER_*` — retry loop attempts
   - `WH_*` — Xero → PT webhook receives
   - `MISSING_PROJECT` / `MISSING_CONTRACT` — push blocked by a missing
     parent that another sync will create; auto-resolves
   - `DELETE_*` — the record is going away in Xero; harmless
   - `EDIT_BANK*` / `EDIT_CONTACT*` — metadata-mirror only
   - Any `*_NOT_MAPPED` — record doesn't exist in Xero, nothing to do
4. **Critical `sync_type`s.** Anything money-moving or user-initiated:
   - `Bills`, `Invoices`, `Payments`, `Claims`
   - `Smart contract`, `Smart contracts`
   - `Retention journals`, `Retention transfer`, `Retention transfers`
   - `Trust movements`
   - `Manual sync`, `Manual sync (two-sided)`
   - `Variable bill code`
5. **Default.** Anything still un-classified (metadata mirror failures on
   `Bank accounts`, `Contacts`, `Projects`, `Contracts`) → `info`.

The dashboard's "Critical" badge counts only severity-critical rows. Info
rows still flow through the snapshot so they're visible in the full
issues list view.

## Title fallback chain

`SyncChecker.buildTitle` composes the one-liner shown on the card. It
prefers the most specific available signal:

1. **Authored `error_message`** when present and 30–160 chars. Authored
   messages usually already include the entity name and what's wrong;
   reusing them preserves nuance the original writer captured.
   Longer messages are truncated with an ellipsis.
2. **Composed: `<sync_type> <action> — <entity> (missing: <fields>)`**.
   Action is inferred from the template description (`add → create
   failed`, `edit → update failed`, `delete → delete failed`).
   Entity is taken from `dynamic_values` (`contact_name`,
   `client_supplier_name`, `account_name`, `project_name`, ...) or the
   `api_payload`. Missing fields come from `dynamic_values.missing_fields`,
   `information_required`, or a regex over the error message.
3. **Stripped template description** as plain text.
4. **Legacy `Xero sync failed (<error_code>)`** as the final fallback.

## Dedup

Rows sharing the same `(severity, title)` collapse to one representative
(the newest) with a `+N more occurrences` suffix and a `Repeated N times
in the last 30 days` line in the description. This prevents one bad
contact from filling the card when it triggers the same Failed log on
every webhook tick.

## Adding or moving templates

When a new Failed template is seeded:

- If it's an automated retry mechanism, name its `sync_type` with the
  word `webhook` or `schedulers` and it will land in `info` automatically.
- If it represents a money-moving / user-initiated action that needs
  immediate attention, ensure its `sync_type` matches one of the
  CRITICAL_SYNC_TYPES strings (or extend that set).
- Avoid setting `dynamic_values.downgrade_reason` outside the Task #274
  contact-mirror interceptor — that flag is treated as authoritative
  "this is noise, trust me" and bypasses the rest of the rule set.

If a one-off template needs special handling that doesn't fit the rules,
prefer editing the rule set in `SyncChecker` over a template-id branch —
the goal is a small, reviewable rule list rather than 423 per-id decisions.
