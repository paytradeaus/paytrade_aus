---
name: Xero by-design payment-delete refusals — idempotent Failed hold (per family)
description: Inbound Xero delete refusals for payments protected by-design must surface as ONE actionable Failed row that does not climb occurrence_count, scoped per refusal family.
---

When an inbound Xero handler (webhook or the ~15-min scheduler) tries to delete a
PayTrade payment that is protected from deletion for a valid by-design reason, the
log must be a genuine, **idempotent Failed hold**: exactly ONE actionable Failed
row per affected payment whose `occurrence_count` does NOT climb on re-delivery.
Do NOT downgrade these to an Info note — the user wants them visible as Failed,
and the re-delivery churn is what was actually wrong.

**Why:** the webhook + scheduler re-deliver the same delete event forever. A
naive Failed write per delivery makes one protected payment look like a recurring
sync failure (occurrence_count climbs ~96×/day per payment).

**Refusal families (keep them separate):** there are distinct by-design
delete-refusal reasons, and their holds must NOT collapse into each other for the
same payment:
- **matched/reconciled** — the payment leg is matched in PayTrade; the hold tells
  the user to unmatch (uncheck) first. Has both Failed templates and legacy Info
  templates in its candidate set.
- **overpayment-refund** — the refund is intentionally protected from deletion in
  PayTrade. Keep the call site's existing "cannot be deleted" message; just stamp
  the standardized error_code + a hold_reason. No legacy Info template exists, so
  its dedup target points at its own Failed template.

**How to apply:** centralize interception inside `insertXeroSyncLogs` via
`maybeHandleByDesignPaymentDeleteSkip`, keyed on the incoming `log_template_id`
through `BY_DESIGN_PAYMENT_DELETE_SKIP_MAP`. Each map entry carries a `family`
discriminator. The idempotency candidate-template lookup MUST be scoped to the
same `family` as the incoming template, or two different holds for one payment
dedupe against each other. Match the existing row on `reference_id` OR
`api_payload->>'payment_id'` — different call sites set different identifiers
(matched sites set `reference_id` = the `xero_payments` row id; overpayment-refund
sites set `reference_id` null and `api_payload.payment_id` = the pt_payment_id).
The guard only runs when at least one identifier is present, so any writer must
set one; the overpayment-refund sites are already gated behind a present
pt_payment_id. The matched-vs-unmatched auto-uncheck decision happens centrally in
`PaymentsService.changeStatusOfAPayment` (`maybeAutoUncheckBeforeDelete`), so an
unmatched-but-confirmed payment is auto-unchecked and deleted with NO sync error;
only a truly matched/reconciled payment reaches the Failed hold.
