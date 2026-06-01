---
name: Client bank details are inline-when-required, not contact-time-required
description: Where a client/contact's BSB/account is actually consumed, and the rule for enforcing it
---

A CLIENT/contact's bank details (BSB + account number) surface only when money is
paid OUT to them — i.e. an "Overpayment refund to client" — in TWO places:
1. `generateAbaFile()` builds the ABA payout line (silently skips if BSB/account missing).
2. The trust JOURNAL/LEDGER: `getJournalRelatedDetailsFor{Claims,Other}Payments`
   join the payee account (`pt` = payment_to_account, and the client-added `cba`
   where `added_by_client_supplier = true`) and write `payment_to_account_*` into
   `JournalEntries.dynamic_values`, shown in the ledger. LEFT JOIN → null-safe.
NO notice ever embeds a client's bank: the bank-bearing remittance notices
("Supplier Payment Remittance Advice", "Supplier Retention Payment Remittance",
"Supplier Payment with Retention Withheld") are SUPPLIER-payment notices reading
the beneficiary (supplier) `payment_to_account`/`retention_account`; the S18B/S23/
QBCC-TA trust-account notices render the COMPANY's own trust account, not the client's.

**Rule (CLIENTS):** bank details are optional at contact add/edit time and enforced
only at payout. The refund-time guard lives in the `'Overpayment refund to client'`
branch of `validateAddPayment`.

**Rule (SUPPLIERS):** bank details ARE required — suppliers are paid routinely and
their bank appears on every remittance notice + ledger + ABA. The FE contact form
(`AddClientsAndSuppliers.validations.ts`) requires the 4 bank fields when
`client_supplier_type.value === "Supplier"` AND `isPaymentDetailsRequired` (bank
sub-form open), via a 2-field yup `.when([...])`; clients are always optional. The
`isPaymentDetailsRequired` gate (vs unconditional) preserves the original behaviour
and avoids blocking edits of bank-less imported (Xero) suppliers.

**Why:** `generateAbaFile()` SILENTLY skips ABA rows missing recipient BSB/account
— so without an explicit pre-check the refund "succeeds" but no money line is
emitted. Forcing bank details on every contact (most never get refunded) was the
friction we removed.

**How to apply:** any refund-time validation of the recipient account MUST resolve
the same account `addPayment` will actually pay to — honour a caller-supplied,
company-owned `payment_to_account`, else fall back to the newest `Open` account
for (client_supplier_id, company_id). Diverging from that resolution causes false
accepts (passes validation, ABA still skips) or false rejects (blocks a refund
that would have worked).

**Xero:** the refund's Xero record (`createOverPaymentRefund`) posts against the
company's OWN bank account, never the client's — so deferring client bank capture
has zero impact on Xero refund sync. Contact-level bank sync is independent.
