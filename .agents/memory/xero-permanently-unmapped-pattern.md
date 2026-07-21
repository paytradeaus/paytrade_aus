---
name: Xero permanently-unmapped sticky flag pattern
description: How sticky "permanently_unmapped" exclusion is implemented across Xero mirror entities (contacts, bills, payments) so webhook/scheduler never re-imports them.
---

# Xero "permanently_unmapped" sticky-exclusion pattern

A per-mirror-row boolean (`permanently_unmapped`, default false, NOT NULL) that
makes an unmapped Xero record stick — webhook and scheduler must never
re-import or re-link it until a user explicitly re-enables.

**Why:** plain Unmap only clears the link; the next sync/webhook re-creates or
re-links the row. Users needed a durable "stop importing this" switch. Keep
plain Unmap AND add a separate permanent variant — they are distinct actions.

**How to apply (when extending to a new Xero mirror entity):**
- Schema: add the column to the entity + an idempotent migration
  (`ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS (integration_id, permanently_unmapped)`).
  Dev applies through TypeORM `synchronize` (dev-only); prod through
  `migrationsRun` (prod-only) — both gated in app.module.ts, so BOTH paths
  are required.
- Service+resolver: a `permanentlyUnmap*` (clear PT link + mapped_status,
  set flag) and a `reEnable*Mapping` (unset flag). Match arg naming to the
  resolver exactly — the FE GraphQL var must map to the snake_case arg
  (e.g. `invoice_id: $invoiceId`, `payment_id: $paymentId`).
- **Write an activity log** on both success paths (permanent-unmap AND
  re-enable), modeled on the contacts implementation: capture actor
  (from_user/admin_id/created_by), company_id, integration_id, and the prior
  link state (previous PT id + previous mapped_status). Wrap the insert in
  try/catch + logger.warn so a logging failure never aborts the unmap. This
  is the established pattern — do NOT skip it (the plain `unMapping*` methods
  omit it, but permanent-unmap is an auditable user decision and must log).
- DI: the service needs `ActivityLogService` injected. Xero services are
  provided in multiple modules (xero, xero-webhooks, banking,
  client-suppliers-details); the dependency must be resolvable in ALL of
  them. ActivityLogService already is, since contacts injects it
  non-optionally and boots — so a plain (non-@Optional) injection is safe.
- **Skip gate is the whole point:** EVERY inbound import/re-link path must
  early-return when the existing mirror is `permanently_unmapped` — webhook
  handler AND the scheduled-fallback path. For contacts that means THREE
  scheduler-side selectors too: the name-match autoMappingRecords query and
  the `xero_to_pt_contact_auto_create` loop both needed an explicit
  `permanently_unmapped = false` filter (`pt_contact_id IS NULL` alone is not
  enough — permanent-unmap NULLs the link, making flagged rows look like
  ordinary unmapped candidates). Symptom of a missed path: rows with
  `permanently_unmapped = true` AND `pt_contact_id` set, relinking weekly.
  After fixing the code, REPAIR existing rows (clear pt_contact_id +
  mapped_status where the flag is true) or the stale links persist. Log the skip at INFO level
  (`logger.log`, matching contacts), idempotent and noise-free (no sync-log
  row). Missing any one path silently defeats the feature.
- List/filter: add a distinct "Permanently unmapped" mapped_status view and
  EXCLUDE these rows from the normal mapped/unmapped lists, or they show up
  in two places.
- Frontend: reuse the existing list endpoint with `mapped_status:
  "Permanently unmapped"`; add a tab + per-row "Re-enable mapping" action,
  and an in-modal "Unmap permanently" button alongside plain Unmap (keep
  both — plain Unmap stays).

Reference implementations: CONTACTS (the template) and bills/payments.
