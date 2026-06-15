---
name: Xero permanently-unmapped sticky flag pattern
description: How sticky "permanently_unmapped" exclusion is implemented across Xero mirror entities (contacts, bills, payments) so webhook/scheduler never re-imports them.
---

# Xero "permanently_unmapped" sticky-exclusion pattern

A per-mirror-row boolean (`permanently_unmapped`, default false, NOT NULL) that
makes an unmapped Xero record stick — webhook and scheduler must never
re-import or re-link it until a user explicitly re-enables.

**Why:** plain Unmap only clears the link; the next sync/webhook re-creates or
re-links the row. Users needed a durable "stop importing this" switch.

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
- **Skip gate is the whole point:** EVERY inbound import/re-link path must
  early-return when the existing mirror is `permanently_unmapped` — webhook
  handler AND the scheduled-fallback path. Make it idempotent and low-noise
  (no failure log spam — it re-runs on webhook + ~15-min scheduler). Missing
  any one path silently defeats the feature.
- List/filter: add a distinct "Permanently unmapped" mapped_status view and
  EXCLUDE these rows from the normal mapped/unmapped lists, or they show up
  in two places.
- Frontend: reuse the existing list endpoint with `mapped_status:
  "Permanently unmapped"`; add a tab + per-row "Re-enable mapping" action,
  and an in-modal "Unmap permanently" button alongside plain Unmap (keep
  both — plain Unmap stays).
- These methods deliberately write NO activity log, matching the existing
  `unMapping*` style (the services don't inject ActivityLogService).

Reference implementations: CONTACTS (the template) and bills/payments.
