---
name: Inbound Xero bill import gating rules
description: How inbound ACCPAY bill outcomes are classified (ignore / Info / Warning / Failed) and the constraints that keep that classification correct.
---

# Inbound bill import (Xero → PayTrade) gating

Core handler: `handleInvoiceCreateUpdate` + `validateAndProcessWebhookInvoice` in `webhook.service.ts`, shared by the webhook and the ~15-min scheduler fallback. The contact-mapping gate runs *before* project/account-code validation, so an unmapped contact short-circuits early — any reclassification has to happen at that contact gate, not deep in validation.

## Outcome rules (the durable decision)
For an inbound bill, the correct outcome is NOT always "Failed":
- **No in-sync PT project tracking id → ignore silently** (no sync log at all). It isn't a PayTrade cost.
- **In-sync project but line account codes not aligned with settings → Info, do not import.** (e.g. overhead-coded bills.) Not a failure.
- **In-sync project + aligned codes + contact simply unmapped → Failed** (genuine bill, user must map the contact). This is the only unmapped-contact case that should stay loud.
- **`permanently_unmapped` contact → always ignore silently**, regardless of doc type.
- **DELETED / VOIDED status → skip silently** before the DRAFT check.
- **Over-contract (`invoice.total > initial_contract_sum`) → import WITH a Warning, never a hard stop.** PayTrade's own UI treats over-contract as a warning; sync must match.

## Constraints that keep this correct
- **Reclassification (ignore/Info) must be scoped to ACCPAY bills only.** ACCREC (receivable invoices) keep the original hard mapping-failure behaviour — the templates/messages are bill-specific.
- **`isAccountCodeValid` is what separates Info from Failed.** Strict mode (`bill_code_is_variable=false`) requires every line's accountCode in the allow-list (`bill_code`, retention/liability codes); overhead bills fail it → Info. Turning smart-contact-create ON does NOT auto-import overhead bills — this gate rejects them first.
- **Project tracking id must be read from ALL line items, not just `lineItems[0]`.** The canonical import path historically read only line 0; a classifier that does the same can mis-verdict a bill whose project tag sits on a later line and silently drop it. Scan all lines.
- **Info/Warning logs need their OWN idempotency guard.** The Failed-dedup path in `insertXeroSyncLogs` only fires for `sync_status==='Failed'`. Since the handler re-runs every webhook + scheduler tick, an Info/Warning branch with no PT record to key on will accumulate ~96×/day. Guard by `(integration_id, log_template_id, api_payload->>'invoice_id', archived_at IS NULL)`; for the over-contract Warning, guard by `!existingXeroInvoice?.pt_claim_id`.

## Payload recording
Inbound logs persist the *received* invoice in `xero_sync_logs.xero_records`, so diagnosis can read stored line items / accountCode / tracking directly — no live Xero call. (Contrast outbound success logs, which historically stored the request not the response — see xero-sync-log-capture-response.md.)
