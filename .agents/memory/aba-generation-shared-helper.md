---
name: ABA file generation shared build path
description: Where the ABA (NAB CEMTEX) file bytes are built, and the rules for generate vs regenerate-in-place.
---

# ABA file generation shared build path

The raw ABA file bytes (header type-0 / transaction type-1 / footer type-7),
the object-storage upload, and the `file_attachments` save all live in ONE
private helper `buildAndUploadAbaFile(...)` in `payments.service.ts`. It returns
the saved fileData plus the record-type-7 control totals
(credit/debit/net cents + transactionCount).

**Why:** both the original `generateAbaFile` flow and the in-place
`regenerateAbaFile` flow call it, so any line-length / padding / control-total
fix applies to both automatically. Put ABA byte-construction fixes HERE, not in
the callers.

**How to apply:**
- The sender APCA number is sourced from the **bank account** record
  (`bankAccountsRepo.findOne({account_number})` → `apca_number`), NOT from the
  sub-payment rows returned by `getListOfSubpayments` (those rows don't carry
  it). The helper takes `apcaNumber` as an explicit param for this reason.
- FI_id comes from `financialInsRepo` keyed on
  `tx.payment_from_account_fin_ins` → `institution_code` (fallback `'NIL'`).

## Regenerate-in-place (no new row)
`regenerateAbaFile` rebuilds for an existing `GenerateABAFileHistory` row:
- Batch membership is reread from the `aba_batch_sub_payments` join table and
  reloaded via `getListOfSubpayments({ sub_payment_ids })` (filter by ids ONLY —
  no `sub_payment_type` whitelist, or a linked payment could be silently
  dropped).
- It only repoints `aba_file_id` + refreshes the `control_*` columns on the SAME
  row. No new history row, no new join-table links, no mark-paid side effects.
- The old `file_attachments` row is left in storage (superseded, kept for audit);
  `FileAttachments` has no status column to flip.
- Guard: only `status = 'Active'` rows; legacy batches with zero
  `aba_batch_sub_payments` rows cannot be regenerated (return an error).
