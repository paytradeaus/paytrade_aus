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
