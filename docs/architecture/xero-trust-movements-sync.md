# Xero Trust Movements Two-Way Sync (Task #231)

End-to-end two-way Xero sync (plus manual catch-up) for non-retention
**trust account movements** between a Project Trust Account (PTA) or
Retention Trust Account (RTA) and that trust account's
`associated_cash_account_id`.

## Scope — payment types covered

PayTrade `payment_type` values handled by this subsystem:

- `Withdrawal`
- `Top Up`
- `Interest Received`
- `Interest Withdrawal`
- `Bank Charge Applied`
- `Bank Charge Top Up`
- `Top Up Retention`

A payment qualifies only when **both** sides of the transfer are owned
by the same company and form a `trust ↔ associated_cash_account_id`
pair (exactly one side is `Project Trust Account` or
`Retention Trust Account`, and the cash side equals the trust account's
`associated_cash_account_id`). Anything else is left alone — this
subsystem does **not** touch retention transfers (those are owned by
the retention/PT-RET pipeline) or client/supplier payments (owned by
the standard payment/invoice pipeline).

## Reference convention

| Reference | Direction | Meaning |
|-----------|-----------|---------|
| `PT-MOV-{payment_id}` | PT → Xero | Outbound push of a PT trust movement |
| `PT-MOV-REV-{payment_id}` | PT → Xero | Reversal posted on un-tick / delete |
| `PT-RET-{payment_id}` / `PT-RET-REV-{payment_id}` | (existing) | Retention transfers — short-circuited here |

The inbound handler short-circuits on both `PT-MOV-*` (mark mapping as
synced) and `PT-RET-*` (defer to the existing retention pipeline).

## Storage

Re-uses the columns added for the Task #50 retention pipeline:

- `xero_payments.bank_transfer_id`
- `xero_payments.bank_transfer_reference`
- `xero_payments.pt_payment_id`

Distinguished from retention rows purely by the reference prefix.

## Outbound flow (PayTrade → Xero)

`XeroPaymentsService.pushTrustMovement(decoded, { payment_id })`:

1. Load `PaymentDetails`, verify `isTrustMovementType(payment_type)`.
2. Verify the company has an active `Connected - active` integration.
3. `resolveTrustMovementPair()` confirms one side is a trust account
   and the other is its `associated_cash_account_id`.
4. Idempotency: if an `xero_payments` row already carries
   `bank_transfer_reference = 'PT-MOV-{id}'`, return success and stop.
5. Resolve both `BankAccounts.bank_account_id` → `XeroBankAccountDetails.account_id`.
6. Refresh token (Redis-locked), then `tryCreateBankTransferWithRecovery`
   (same helper used by retention) with reference `PT-MOV-{id}`.
7. Upsert the `xero_payments` mapping row.
8. Write sync log **615** (success) or **616** (failure).

**Wiring (outbound trigger):** `payments.resolver.ts → addPayment` —
after the existing retention / overpayment branches, when the saved
payment's `payment_type` is a trust-movement type the resolver calls
`pushTrustMovement` in a try/catch (fire-and-forget; the service writes
its own Failed sync log row for retry).

> Edit (`editDetailsOfAPayment`) and delete paths are **deferred** —
> trust movements are append-only in the PT UI today; if/when the PT
> UI gains edit/delete for these types, wire `reverseTrustMovement` +
> `pushTrustMovement` into those resolver paths the same way.

## Reversal flow

`XeroPaymentsService.reverseTrustMovement(decoded, { payment_id })`:

- Posts an **opposite-direction** Xero BankTransfer with reference
  `PT-MOV-REV-{id}` (Xero has no `deleteBankTransfer`).
- Updates the `xero_payments` row's `bank_transfer_id` /
  `bank_transfer_reference` to point at the reversal.
- Sync log **617** (success) or **618** (failure).

## Inbound flow (Xero → PayTrade)

`XeroPaymentsService.handleInboundTrustMovementBankTransfer({ resource_id, tenant_id, sync_run_type }, decoded)`:

1. Load integration by `tenant_id`, refresh token, fetch the
   `BankTransfer` from Xero by id.
2. **Self-echo** — reference matches `PT-MOV-*` or `PT-MOV-REV-*`:
   upsert the mapping if missing, write log **619**, stop.
3. **Retention echo** — reference matches `PT-RET-*`: no-op, returns
   `success: true` with a "handled by retention flow" message.
4. **Already mapped** — `xero_payments` already has this
   `bank_transfer_id`: no-op.
5. Resolve `fromBankAccount.accountID` / `toBankAccount.accountID` →
   `XeroBankAccountDetails` → `BankAccounts`. Reject (log **621**)
   when either side is unmapped, or the pair is not
   trust ↔ associated cash.
6. Pick the inbound direction → PT `payment_type`:
   - trust → cash → `Withdrawal`
   - cash → RTA → `Top Up Retention`
   - cash → PTA → `Top Up`

   `Interest Received/Withdrawal` and `Bank Charge Applied/Top Up`
   cannot be inferred from the Xero side alone — users re-classify
   imported movements in the PT UI if needed. The default is the
   safest neutral movement.
7. Materialise the PT side **inside one `entityManager.transaction`**:
   `PaymentDetails` (status `Confirmed - Matched`) +
   matching `SubPayments` (sign flipped for outflow) +
   `xero_payments` row stamped `PT-MOV-{newPaymentId}`.
8. Sync log **620** (imported).

## Webhook wiring

`XeroWebhookQueueConsumer` (`webhook-queue-consumer.service.ts`) adds
a `BANKTRANSFER.CREATE` / `BANKTRANSFER.UPDATE` switch branch that
forwards the event to the inbound handler. `XeroPaymentsService` is
injected via the constructor (the service is already a provider in
`XeroWebhookModule`).

> Xero does **not** ship a dedicated BankTransfer webhook category in
> the current API; in practice these events arrive bundled with the
> mirror `PAYMENT` / `INVOICE` records. The dispatch case is wired
> defensively so that if Xero ever delivers one, we handle it without
> a code change. Day-to-day inbound coverage is provided by the
> manual re-sync flow below and the existing payment/invoice
> webhooks for the cash-side mirror.

## Manual catch-up

`XeroWebhookService.manualXeroResync` accepts a new `type` value
`trust_movement`. The `id` is a Xero `BankTransferID` GUID. The
handler validates the GUID, writes the standard template-499
trigger row, then delegates to
`handleInboundTrustMovementBankTransfer({ ..., sync_run_type: 'manual' })`.

The frontend manual re-sync picker only needs the new option added to
its `type` dropdown — no other FE changes required.

## Sync log templates

| id  | sync_type        | direction       | meaning                                             |
|-----|------------------|-----------------|-----------------------------------------------------|
| 615 | Trust movements  | PT → Xero ✓     | Outbound push succeeded                             |
| 616 | Trust movements  | PT → Xero ✗     | Outbound push failed                                |
| 617 | Trust movements  | PT → Xero ✓     | Reversal posted                                     |
| 618 | Trust movements  | PT → Xero ✗     | Reversal failed                                     |
| 619 | Trust movements  | Xero → PT ✓     | Inbound matched our own PT-MOV reference (echo)     |
| 620 | Trust movements  | Xero → PT ✓     | Inbound imported as new PT payment                  |
| 621 | Trust movements  | Xero → PT ⚠     | Inbound ignored (unmapped accounts / not a pair)    |

## Schema dependencies

- `xero_payments.contact_id` is **nullable** (made so by
  `XERO_PAYMENT_SPLIT_SCHEMA` seeder, Task #231) because trust
  BankTransfers have no Xero contact.
- `xero_payments.account_id` stores the **mapped row PK**
  (`xero_bank_account_details.id`), not the raw Xero account GUID —
  trust-movement inserts follow that convention so existing joins
  keep working.
- `uq_xero_payments_bank_transfer_id` (partial unique index on
  `bank_transfer_id`) collapses any webhook ↔ manual-sync race into
  a single winning insert; the loser swallows the violation and
  exits with `"already mapped (concurrent insert)"`.

## Edit / cancel / delete wiring

`payments.resolver.ts`:

- `addPayment` — fires `pushTrustMovement` when `isTrustMovementType`.
- `editDetailsOfAPayment` — when `isTrustMovementType`, calls
  `reverseTrustMovement` (if previously mapped) followed by
  `pushTrustMovement` so the Xero side reflects the new amount /
  date / accounts. If the new status is `Cancelled` or
  `Unconfirmed - Unmatched`, the re-push is skipped.
- `changeStatusOfAPayment` — when the new `current_status` is
  `Cancelled` / `Unconfirmed - Unmatched`, calls
  `reverseTrustMovement` so the previously-pushed BankTransfer is
  netted out in Xero. Xero has no `deleteBankTransfer`, so we always
  reverse rather than delete.

## Catch-up scheduler

`xero-scheduler.service.ts → trustMovementCatchupSync()`:

- `@Cron('*/15 * * * *')` per active Xero integration.
- Lists `getBankTransfers(since = now-2h)`, filters out anything
  already in `xero_payments.bank_transfer_id`, and delegates each
  unknown row to `handleInboundTrustMovementBankTransfer` with
  `sync_run_type='scheduler_catchup'`. Anti-echo + the unique
  index keep this safely repeatable.

## Inbound `payment_type` resolution

`handleInboundTrustMovementBankTransfer` infers the PT
`payment_type` from direction + reference text:

| Direction       | Reference keyword | Resulting payment_type   |
|-----------------|-------------------|--------------------------|
| Trust → Cash    | `interest`        | `Interest Withdrawal`    |
| Trust → Cash    | `bank charge/fee` | `Bank Charge Applied`    |
| Trust → Cash    | (none)            | `Withdrawal` *(ambiguous warn 621 if reference is empty)* |
| Cash → Trust    | `interest`        | `Interest Received`      |
| Cash → Trust    | `bank charge/fee` | `Bank Charge Top Up`     |
| Cash → RTA      | (none)            | `Top Up Retention`       |
| Cash → PTA      | (none)            | `Top Up` *(ambiguous warn 621 if reference is empty)* |

An empty / hint-less reference produces a 621 warn so the admin
knows to re-classify in PayTrade if needed.

## Manual re-sync

`webhook.service.ts → manualXeroResync` / `manualXeroResyncLookup`
/ `manualXeroPreflight`:

- `type='trust_movement'` accepted alongside the existing types.
- Lookup aliases to the `bank_transfer` branch so the same
  PT-MOV-{id} reference search and BankTransfer scan are reused.
- Dispatch routes to `handleInboundTrustMovementBankTransfer` so the
  anti-echo + materialise paths are exercised exactly as a webhook
  delivery would.

## Deferred / out of scope

- **Frontend "Trust movement" dropdown option** in the manual
  re-sync admin page (backend already accepts the type; UI follows
  in Task #234).
