---
name: S75 non-paid-reason gate wiring
description: How the inbound-Xero S75 "reason for non-paid claims" hold surfaces a reason form on the sync page, and the manual-import parity gap.
---

# S75 non-paid-reason gate (inbound Xero ACCREC head-contractor imports)

The gate fires when a Head-Contractor→Principal claim imports with unpaid
subcontractor claims and no `claims_with_reason` (Xero never supplies it). It
writes a Failed sync log whose **`error_code` lives on the log TEMPLATE, not the
row** — the frontend reads it via a `template.error_code AS error_code` join.

Three sources, three templates/error_codes:
- manual import → 359 / `XP_ADD_INVOICE_MISSING_NON_PAID_REASONS`
- webhook → 353 / `WH_MISSING_NON_PAID_REASONS`
- scheduler → 456 / `SCHEDULER_MISSING_NON_PAID_REASONS`

Frontend flow: `resolveHandle` → `commentsTableResolve` switches on `error_code`,
fetches unpaid subs via `fetchSubContractorClaimsByHeadContractor({project_id:
api_payload.project_id})`, opens a modal with ONE reason box per unpaid claim
(per-claim, same shape as the normal add-payment flow's `generateClaimData` →
`pending_claims_with_reason`), posts `claims_with_reason`, re-runs the import →
generates the S75 PDF → clears the hold.

**Why webhook/scheduler worked but manual didn't:** the modal needs
`api_payload.project_id` and the manual mutation needs a required `companyId`.
The webhook/scheduler gate logs included `project_id`; the manual (359) gate log
historically wrote only `{invoice_id}`, and the manual `createInvoiceOrBillInPaytradeTable`
call omitted `companyId` (GraphQL `$companyId: Float!`). So any new gate site or
mutation call must keep manual at parity with webhook/scheduler.

**Auto-clear when claims were since paid:** `fetchSubContractorClaimsByHeadContractor`
filters out `list_status IN ('Completed','Reconcile')`, so once paid it returns an
empty list and the reason modal (guarded by `generateClaimData?.length > 0`) never
renders. Resolution: when the fetch SUCCEEDS but the unpaid list is empty, re-run
the import with `claims_with_reason:[]`; the backend recomputes `claimNotPaidCount`
and (===0) passes the gate, clearing the hold. Distinguish empty-because-paid from
empty-because-fetch-failed, else a transient error would fire a needless retry
(backend safety-net makes it benign, but still). The backend recount is the real
guard — the frontend "all paid" inference can never clear a still-required hold.
