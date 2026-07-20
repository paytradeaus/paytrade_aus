---
name: pt_to_xero_contract_auto_create — gating wiring
description: Setting that auto-pushes new PT contracts to Xero as tracking options. Lives on xero_integration_details. Originally dead config; gating must be checked at every PT contract creation site, not just the user-triggered resolver.
---

The rule

- `xero_integration_details.pt_to_xero_contract_auto_create` (bool) is a
  per-company opt-in. When true, every newly created PT contract — regardless
  of how it was created — should be pushed to Xero as a tracking option via
  `XeroContractsService.createContractTrackingOptions(decoded, {contract_id,
  mapped_status:'System'})`.
- "Every PT contract creation site" today means two places:
  1. `ContractDetailsService.insertContractDetails` (user GraphQL).
  2. `XeroInvoicesService.smartCreateContract` (bill-import auto-create).
  If a third creation site is ever added, it must also honour the setting.

**Why:** The setting existed on the entity and was plumbed through inputs and
updates but was never read as a gating condition anywhere, so toggling it on
in production did nothing. That created confusing support cases where users
had the toggle on but the tracking option never appeared in Xero.

**How to apply:**

- The auto-push call must be wrapped in try/catch — `createContractTrackingOptions`
  already records its own failures to `xero_sync_logs` (tpl-30 etc.); a Xero-side
  error must never break PT contract creation.
- For DI: `ContractDetailsService` is provided in 5+ sibling modules to avoid
  circular imports. Follow the `shared-service-optional-di.md` pattern —
  `@Optional()` on both the repo (`XeroIntegrationDetails`) and the service
  (`XeroContractsService`). The owner `ContractDetailsModule` is the only
  module that needs them in scope for the user-create path. Xero-inbound
  callers (scheduler, xero-contracts.service syncing Xero → PT) intentionally
  see `undefined` so they don't echo Xero contracts back to Xero.
- `mapped_status: 'System'` distinguishes auto-pushes from manual user
  pushes ('User') in sync log audit trails.

Self-heal at the outbound edit gate

- Contracts created BEFORE the toggle/contract-sync was enabled have no
  `xero_contract_details` mirror row, and there is no manual re-sync type for
  contracts (`manualXeroResync` allowedTypes excludes 'contract'), so
  `editInvoiceOrBillInXero` used to hard-fail with template 116/128
  ("Contract details not mapped") with no user-fixable path.
- Fix: the edit gate now attempts `createContractTrackingOptions` (idempotent:
  links an existing same-name tracking option or creates one) when the mirror
  row is missing and the toggle is on, then re-fetches the mirror before
  failing. The create path never hard-failed — it proceeds without contract
  tracking — the edit path was the only hard-fail.
