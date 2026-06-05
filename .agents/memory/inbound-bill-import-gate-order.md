---
name: Inbound Xero bill import gate order & account-code validity
description: Why overhead bills with a valid project tracking id still hard-fail as contact-not-mapped, and why the contract-size gate hard-stops.
---

# Inbound bill import (Xero → PayTrade) gate order

Core handler: `handleInvoiceCreateUpdate` (back-end/src/api/common/xero-webhooks/webhook.service.ts), used by both webhook and scheduler fallback paths.

Gate order for an ACCPAY bill:
1. Status check — **only DRAFT is skipped**. DELETED / VOIDED bills are NOT skipped, so they still flow through and can hard-error.
2. Contact lookup in `xero_contact_details` mirror.
3. Smart-create gate: fires only if `smart_contact_auto_create` AND `isAccountCodeValid(invoice)` are both true.
4. **Hard contact-not-mapped failure** → logs template 425 (scheduler) / 265 (webhook) as `Failed`, `return false`. Short-circuits here.
5. Only AFTER contact is mapped: `validateAndProcessWebhookInvoice` runs project-tracking validation, account-code validation, then size check.

**Consequence:** the contact gate fails *before* project-tracking / account-code checks. A bill that carries a valid, in-sync project tracking id but is coded to overhead accounts (not the configured `bill_code`) still logs a recurring `Failed` contact-not-mapped error.

## isAccountCodeValid (line ~14365)
- If `bill_code_is_variable = true`: lenient — every line needs *some* accountCode, and at least one line must be a non-restricted (non-retention/liability) code.
- If `bill_code_is_variable = false` (strict): **every** ACCPAY line's `accountCode` must be in the allow-list `[bill_code, retention_payable_retained_code, liability_payable_code, retention_payable_release_code]`. Overhead-coded bills fail → smart-create is skipped → falls through to the 425 hard error.

**Why this matters:** turning smart contact-create ON does NOT make overhead-coded bills auto-import — `isAccountCodeValid` rejects them first. They keep hard-failing unless an Info-downgrade path is added.

## Contract-size gate (V-Step 18, line ~4373)
Hard-stops (`return false`, template 437 `Failed`) when `Number(invoice.total) > Number(contractDetails.initial_contract_sum)`. There's a leftover `//send warning email` comment — original intent was a warning. PayTrade's own UI treats over-contract as a validation *warning*, not a hard stop, so sync should import-with-warning, not reject.

## Payload recording
Inbound failure logs DO already persist the received invoice in `xero_sync_logs.xero_records` (confirmed for templates 425, 437, 638). For inbound, `xero_records` = what we received from Xero, so diagnosis can read the stored payload (line items, accountCode, tracking) directly — no live Xero call needed. (Contrast outbound: success logs historically stored the request, not the response — see xero-sync-log-capture-response.md.)
