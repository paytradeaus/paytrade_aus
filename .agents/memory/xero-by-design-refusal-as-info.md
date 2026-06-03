---
name: Xero by-design refusals — Info vs genuine Failed hold (payment-delete nuance)
description: When an inbound Xero handler refuses an op, decide Info-once vs idempotent-Failed-hold by whether the user must act; payment-delete refusals now split matched vs unmatched.
---

When an inbound Xero handler refuses an operation, the log class depends on
whether the user must act:

- **Truly terminal by design, no user action needed** → reclassify to an **Info**
  template, written at most once per affected resource. The webhook + ~15-min
  scheduler re-deliver forever, so a Failed row's `occurrence_count` would climb
  indefinitely and look broken.
- **Refused because the user must fix something first** → a genuine, **idempotent
  Failed hold** (one row whose occurrence does NOT climb), so it surfaces as an
  actionable error, not a silent Info note.

**Payment-delete nuance (supersedes the original #359 "always Info" rule):**
A Xero-inbound delete of a PT payment is now split by the PAYMENT leg's match
state:
- Payment-leg **UNMATCHED** (even if confirmed) → NOT refused. It is
  auto-unchecked (reversing confirmation journals via the SERVICE
  `editDetailsOfAPayment`) and then deleted. No sync error at all.
- Payment-leg **MATCHED/reconciled** → genuine idempotent **Failed** hold
  (error_code `WH/SCHEDULER_PAYMENT_MATCHED_DELETE_BLOCKED`), telling the user to
  unmatch (uncheck) first. This intentionally REPLACED the quiet Info note
  (641/642) that #359 introduced for the confirmed-payment case.

**Idempotency mechanics:** the Failed-only dedup gate and Failed-only failure
email in `insertXeroSyncLogs` mean: for a Failed HOLD you rely on the dedup gate
keyed on (template, `reference_id`) so it stays one row; for an Info note you must
add your OWN idempotency guard (Info bypasses the dedup gate) or rows pile up
one-per-delivery.

**How to apply:** prefer centralized interception inside `insertXeroSyncLogs`
keyed on the incoming template id, rather than editing every catch block — the
payment-delete refusal alone had ~16 identical webhook call sites. Match on the
field every writer reliably sets: `reference_id` (= the `xero_payments` row id),
with `api_payload.payment_id` as fallback. The matched-vs-unmatched decision and
auto-uncheck happen centrally in `PaymentsService.changeStatusOfAPayment`
(`maybeAutoUncheckBeforeDelete`), so the webhook path inherits the behaviour.
