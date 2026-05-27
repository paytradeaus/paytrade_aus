# Xero createPayment / createBankTransfer Response Validation (Task #313)

## Symptom

A Signature Profile (company_id 1012) user generated an ABA batch with
"Mark as paid" ticked. PayTrade wrote `xero_payments` rows with
`status='AUTHORISED'`, real-looking `paymentID`s, and template-168
"Export successful" sync logs for all 5 payments. The user reported the
bills in Xero still showed as **owing** and they had to add each payment
manually.

## Diagnosis

Reconciling the 5 affected rows against live Xero state:

| pt_payment_id | xero `paymentID` recorded | xero invoice GUID (mapped) | Xero invoice status now |
|---|---|---|---|
| 10000000032 | b6afc01d… | 078944dc… | PAID |
| 10000000037 | 6b84dea5… | b91ada67… | PAID |
| 10000000038 | 7583057b… | dc343556… | PAID |
| 10000000039 | 9fe6ea02… | 3cccd260… | **AUTHORISED (unpaid)** |
| 10000000040 | 6a154661… | 69d77e79… | PAID |

The 4 PAID statuses are the result of the user manually adding payments
in Xero after seeing the bills unpaid — they are not evidence our pushes
landed. Bill 100065 / payment 10000000039 is the smoking gun: PayTrade
holds a real-looking Xero `paymentID` and a Succeeded sync log, but the
bill it claims to have paid is still AUTHORISED — and the user has not
yet manually fixed this one.

Inspecting the `xero_records` column on the template-168 success rows
revealed the root cause: every success log was storing the **request
payment object** (`xero_records: [payment]`), not Xero's actual response.
That meant we had zero forensic record of what Xero actually returned —
matching the class of bug captured in
`.agents/memory/xero-success-requires-real-id.md`.

The success gate at the failure point read:

```ts
const paymentLegOk = skipPayment ? true : !!response?.body?.payments;
```

This only checks that `payments` is a truthy array on the response. It
does **not** check that:

- `payments[0].paymentID` is a real UUID (Xero can return an element
  with `statusAttributeString='ERROR'` and `validationErrors[]` populated
  but no `paymentID`),
- the returned `status` isn't `DELETED` / `REVERSED` / `VOIDED`,
- the returned `invoice.invoiceID` matches the one we sent (stale or
  duplicated `xero_invoices_bills` mapping pointing at a different
  invoice),
- the returned `amount` agrees with the amount we sent.

Any of those silent-success branches would persist an AUTHORISED
`xero_payments` row + emit template 168 ("Export successful") even though
nothing usable landed on the user's bill. The BankTransfer leg
(`accountingApi.createBankTransfer`) had the same shape:
`if (retentionTransfer?.body?.bankTransfers)` accepted any truthy array
without inspecting `bankTransferID`.

## Fix

`back-end/src/api/common/integrations/xero/payments/xero-payments.service.ts createPayment()`:

1. **Payment-leg response validation.** A new `validatePaymentResponse`
   helper runs immediately after `accountingApi.createPayment` returns
   and rejects responses that:
   - have no `payments[0]`,
   - have `payments[0].paymentID` missing,
   - carry `statusAttributeString='ERROR'` or non-empty
     `validationErrors[]`,
   - return `status` ∈ `{DELETED, REVERSED, VOIDED}`,
   - attach the payment to an invoice other than the one we sent, or
   - record a different amount (tolerance $0.01).

   On failure, the function writes a **template 627** Failed sync log
   (`PD_PAYMENT_RESPONSE_INVALID`) carrying the actual Xero response
   body in `xero_records`, does NOT persist a `xero_payments` row,
   skips the retention BankTransfer leg, and returns `false`. The
   resolver gate (`pushPaymentLegsToXeroAfterMarkPaid` and the manual
   confirm flow) will re-attempt on the next tick.

2. **BankTransfer-leg response validation.** Mirrors the payment-leg
   checks: requires `bankTransferID` on `bankTransfers[0]` and rejects
   non-empty `validationErrors[]`. On failure, writes a **template 628**
   Failed sync log (`PD_BANK_TRANSFER_RESPONSE_INVALID`), flips
   `transferFailedWithoutRecovery` so the contradictory template-500
   "transfer created" success log is suppressed (Task #54 logic
   re-used), and the payment leg's outcome is preserved untouched.

3. **Forensic capture in the success log.** Template 168 now stores
   `response.body.payments` (the actual Xero response array) in
   `xero_records` instead of the request payload — so any future
   incident that slips past the validators above is at least
   diagnosable from the sync log alone, without needing to dig through
   backend logs.

Per-leg gate-split semantics (Task #50), the exceeds-outstanding
auto-recovery (Task #51), the BankTransfer auto-recovery (Task #54),
and the un-tick → delete symmetry (Task #52) are all unchanged. The
validation runs before any of those branches.

## Recovery for Signature

For the 4 bills that already show PAID in Xero (10000000032 / 37 / 38 /
40), the user's manual payments are the source of truth. The PayTrade
`xero_payments` rows holding the phantom `paymentID`s can stay in place
— they will never be re-pushed because the resolver gate sees
`existingXp.payment_id` and short-circuits — but they no longer match
any real Xero payment. Use the **Manual Xero re-sync** dialog
(`Xero Dashboard → Sync Log → Manual sync`) in `import` direction with
the Xero invoice GUID for each of the four bills; the inbound replay
will overwrite the local mirror with whatever payments now actually
exist on the invoice in Xero.

For bill 100065 / payment 10000000039 (still AUTHORISED in Xero, no
manual payment yet), the same dialog in `push` direction with the
PayTrade payment id will re-attempt the createPayment — and any future
silent-failure response will now surface as a template-627 Failed sync
log the user can act on.

## Regression check

The post-fix ABA "mark as paid" flow against a bill in a non-prod
tenant produces one of two outcomes:

- **Happy path** — Xero returns a real `paymentID` attached to the
  expected invoice with `status=AUTHORISED`: template 168 fires with
  the actual response captured in `xero_records`, the `xero_payments`
  row is persisted, and the bill flips to PAID in Xero.
- **Failure path** (intentional misconfiguration — pointed at a VOIDED
  invoice or amount-mismatch): template 627 fires with the validation
  reason and the raw Xero body; no `xero_payments` row is written; the
  resolver can retry once the underlying mapping is fixed.

The previous silent-success path is no longer reachable from this code
site.

## Task #318 — Invoice-state checks on the same response

Task #313 inspected the **payment** element on the response
(`paymentID`, `status`, `validationErrors`, attached `invoiceID`,
`amount`). It deliberately did **not** read the embedded invoice block
on `payments[0].invoice` — and that left one more silent-success branch
open: Xero can accept a payment object that looks correct, yet leave
the bill's `amountDue` unchanged (payment lands on a credit-note line,
over-payment branch, currency/locking edge case, etc.). The payment
element would pass `validatePaymentResponse`, the bill in Xero would
still show as owing, and PayTrade would still write the success log.

Task #318 extends `validatePaymentResponse` with several layered checks
on the embedded `invoice` block. All failures route to **template 629**
(`PD_PAYMENT_AMOUNTDUE_UNCHANGED`), not template 627, so operators can
distinguish "payment element unusable" from "payment element ok but
bill not paid down".

To detect the silent-failure case reliably on bills that already had
prior partial payments, we capture the bill's `amountDue` **before**
calling `createPayment` via a single `getInvoice` GET. (The PT mirror
tracks `total` but not `amountDue`, so a one-shot Xero fetch is the
cheapest way to get the pre-push value. This is drift from the
original "no extra GET round-trip" plan, accepted on code review:
without the pre-push value, any post-push `amountDue` that happens to
sit below `total − expectedAmount` passes the loose ceiling check
even if the payment was never applied.)

The checks, in order:

- **Our `paymentID` must appear in `invoice.payments[]` (strongest,
  no-cost).** Xero typically embeds the bill's payment roster on the
  response. If the array is present and our just-created `paymentID`
  is not in it, the payment was not applied to this bill.
- **Pre-push vs post-push `amountDue` delta.** When the pre-push
  `getInvoice` succeeded, the bill's `amountDue` must drop by exactly
  `expectedAmount` (±0.01 cent). This is the catch-all for prior
  partial payments.
- **`amountDue` ceiling fallback.** When the pre-push GET failed or
  returned no numeric `amountDue`, fall back to the loose check
  `amountDue ≤ total − expectedAmount + 0.01`. Only fires on bills
  with no prior partials.
- **`amountDue≈0` with `status≠PAID`.** Self-consistency check: if
  the bill's outstanding is zero, the status must be `PAID`.
  `AUTHORISED`, `VOIDED`, etc. all route to template 629.

Both checks are guarded — if `invoice` is missing, or `total` /
`amountDue` aren't numeric, the validator falls through under the
existing Task #313 checks rather than emit a false-positive failure.

`validatePaymentResponse` now returns `{ reason, template: 627 | 629 }`
so the failure log goes to the right template (628 still covers the
BankTransfer-leg path). The downstream handling — no `xero_payments`
row persisted, retention BankTransfer leg skipped, return `false` for
resolver retry, raw Xero body in `xero_records` — is identical to
Task #313.

The durable rule (also captured in
`.agents/memory/xero-success-requires-real-id.md`): when an API
response embeds the affected object, validate the object's
post-mutation state, not just the action object.
