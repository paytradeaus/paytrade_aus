---
name: Xero outbound payment-delete lives in the resolver, not the service
description: Where the PT→Xero deletePayment push fires on payment deletion, and why that placement is the anti-echo boundary.
---

When a PT payment is deleted, the PT→Xero `deletePayment` push fires from the
payment **resolver**'s `changeStatusOfAPayment` mutation (after it calls the
service), NOT from `PaymentsService.changeStatusOfAPayment` itself. The service
method only mutates PT state (and, via auto-uncheck, reverses journals through
the SERVICE `editDetailsOfAPayment`, which also does not push to Xero).

**Why:** This split IS the anti-echo design. Xero-inbound deletes call the
SERVICE directly (webhook → `safeWebhookDeletePayment` → service), so they never
re-push a delete back to Xero. Manual UI deletes go through the RESOLVER, which
pushes. Adding an outbound `deletePayment` call inside the service (or routing
auto-uncheck through the RESOLVER `editDetailsOfAPayment`) would create an echo
loop on inbound deletes.

**How to apply:** Want a PT-side action to also delete/mutate in Xero? Wire it at
the resolver layer (which already injects `XeroPaymentsService`). Do NOT add the
push to the shared service method — it's reached by both inbound and manual paths.
The resolver already injects `xeroPaymentsService`, avoiding the circular-DI
problem you'd hit adding it to `PaymentsService`.

Related: `deletePayment` will not delete a payment that is reconciled in Xero
(`xero_payments.is_reconciled`) — Xero rejects it. The delete path passes an
internal (non-`@Field`) `block_if_reconciled` flag on `DeletePaymentInput` so the
guard logs a clear Failed sync error (template "DELETE_PD_PAYMENT_RECONCILED")
and returns false, scoped to the delete path only; the per-leg un-tick path
leaves the flag unset to preserve its existing behaviour.
