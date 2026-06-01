---
name: Client bank details are inline-when-required, not contact-time-required
description: Where a client/contact's BSB/account is actually consumed, and the rule for enforcing it
---

A client/contact's bank details (BSB + account number) are consumed in exactly
ONE outbound flow: paying the client back via an "Overpayment refund to client",
where `generateAbaFile()` builds the ABA line. Everything else about a contact is
inbound, and trust notices use the trust account's own details, not the client's.

**Rule:** bank details are optional at contact add/edit time and must be enforced
only at the moment of payout. The refund-time guard lives in the
`'Overpayment refund to client'` branch of `validateAddPayment`.

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
