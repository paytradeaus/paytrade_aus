---
name: Reconciling failed outbound Xero payment pushes
description: When an outbound PT→Xero payment push fails but the bill/claim was actually settled in Xero, link the existing inbound-imported xero_payments row instead of inserting a new one.
---

# Reconciling failed outbound Xero payment pushes

When a PT→Xero payment push logs Failed (e.g. tpl 332 "Account could not be found",
tpl 190 "Claim is in paid state") but the invoice was in fact paid inside Xero, do
NOT insert a new `xero_payments` row to "link" it.

**Why:** Xero almost always already delivered that payment back inbound (webhook /
~15-min scheduler), creating an `xero_payments` row keyed on the Xero `payment_id`
but with `pt_payment_id = NULL` (unlinked). Inserting another row duplicates the
Xero payment. The inbound dedup only protects on `payment_id` (service.ts ~155), not
on a second hand-inserted row.

**How to apply:**
- Find the existing inbound row(s) by the unique Xero `PaymentID` (globally unique,
  1:1 with an invoice). Cross-check `payment_amount` matches the PT payment.
- Replicate the sanctioned manual-map UPDATE (mapYetToMapPayments, service.ts ~8195):
  `UPDATE xero_payments SET pt_payment_id=<PT id>, mapped_status='Manual', updated_on=now()`
  matched on `payment_id` (+ amount guard, + `pt_payment_id IS NULL`).
- Setting `pt_payment_id` is what blocks future outbound re-push (guards at ~8172/8182).
- Then archive the stale Failed logs (`archived_at=now()`, `archive_note`); read path
  hides them via `archived_at IS NULL`. Archiving also removes the only retry entry point.

**Batch payments:** an invoice's `Payments[].PaymentID` returned by `getInvoice` can be
the **BatchPaymentID**, not an individual PaymentID — `GET /Payments/{batchId}` 404s.
Fetch `GET /BatchPayments/{id}` to get each invoice's real individual PaymentID.

**Schema gotcha:** `xero_payments.invoice_id` stores the **`xero_invoices_bills` PK
(mirror-row id)**, NOT the Xero `invoice_id`. So a row's `invoice_id` will not equal
the Xero InvoiceID from the API — join through `xero_invoices_bills.id` to reach the
Xero invoice id / `pt_claim_id`.
