---
name: Receivable claim creation couples to notice (incl. PDF) generation
description: Why an ACCREC/Receivable claim can silently fail to persist with no record-linked log — notice generation runs inside the claim transaction.
---

When `addPaymentClaim` creates a `claim_type='Receivable'` claim with `status !== 'Draft'`, it
synchronously calls the notice trigger **inside the same DB transaction**. For a Receivable claim
the notice trigger forces `trustAccountNotice = true` and generates the "Client Payment Claim
Notice". If `getSubscriptionType` returns `Paid` / `Paid-delegated` (paid plan + bank account
`delegate_powers='Yes'`), it additionally runs `generateNoticeDocument` — a Puppeteer PDF render
+ storage upload — still inside that transaction.

Any throw anywhere in that notice path is caught and surfaced as `framedResponse('ERROR', …)`,
which makes `addPaymentClaim` `throw new Error('Notice generation failed')`. Because it's all one
transaction, the just-inserted claim (and its invoice lines) **roll back** — so the claim never
persists. A clean way to confirm this class of failure from prod: the target contract has **zero**
`payment_claims` rows even though import/validation succeeded.

**Why:** This coupling means a problem in notice/PDF generation (template render, a null field the
template needs, storage upload, or the worker process lacking Chromium) presents as a *claim
creation* failure, not a notice failure. The reconciliation guard (`claim_amount` vs Σ lines) is a
red herring for single-line invoices — it nets to delta 0.

**How to apply:** When an ACCREC/Receivable Xero invoice imports but no claim appears, suspect the
notice-generation step, not mapping/validation (those log their own record-linked rows). On
pre-#346 code the Xero importer let `addPaymentClaim`'s throw escape to an outer catch that logged
with an orphaned reference (no `reference_id`) — so only the template-520 trigger row appears and
the user sees "no idea why". #346 wraps the call and writes a reference-stamped Failed log
(templates 636/637, `error_message = claimErr.message`) — deploy it (or reproduce the call) to get
the exact throwing line.
