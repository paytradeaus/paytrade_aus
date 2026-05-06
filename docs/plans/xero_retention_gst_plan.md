# ProCore → SmoothX → Xero retention GST plan

**Status:** Awaiting client confirmation from ProCore/SmoothX on whether the retention line is intended to be ex-GST (current behaviour) or inc-GST (PT's expected behaviour).
**Owner:** TBD
**Trigger to action:** Client reply confirming bug + corrected line layout.

---

## 1. The observed format

Bill `2501-SC-009` arriving in Xero from ProCore via SmoothX (Tax Exclusive invoice):

| # | Description | Account | Tax Rate | Amount AUD |
|---|---|---|---|---|
| 1 | electrical temps gantry | Sub Contractors | GST on Expenses (10%) | 14,937.80 |
| 2 | Retention Retained (liability) | Retention Payable | BAS Excluded | 786.20 |
| 3 | Retention Retained | Retention Held For Subcontractors | BAS Excluded | (786.20) |

Subtotal 14,937.80 + GST 1,493.78 + Retention liability 786.20 → **Total 16,431.58**.

PT-side claim 100015 imported from this bill shows: ex-GST sub-total **15,724.00**, GST **1,493.78**, total **17,217.78**, retention **786.20**.

Discrepancy: PT total (17,217.78) − Xero bill total (16,431.58) = **786.20** = the retention amount, i.e. the **GST on the retained portion (78.62) plus the retention itself is being held GST-exclusive in Xero**. When the retention is later released, Xero's BAS-Excluded retention liability has no GST attached, so the head contractor effectively underpays the sub by 10% × 786.20 = **78.62 per claim**.

## 2. What the client/PT believe the correct layout is

For an Inclusive-GST or Exclusive-GST claim where line 1 attracts GST:

| # | Description | Account | Tax Rate | Amount AUD |
|---|---|---|---|---|
| 1 | Work item | Expense account | GST on Expenses (10%) | claim ex-GST less retention ex-GST |
| 2 | Retention Retained (liability) | Retention Payable | BAS Excluded | retention **inc-GST** |
| 3 | Retention Retained (asset) | Retention Held For Subcontractors | BAS Excluded | **(retention inc-GST)** |

Net effect: GST is paid in full on the work value, and the full inc-GST retention (864.82 in this example) is held on the balance sheet, with the release later carrying no further GST.

This already matches what PT itself produces on the producer side after the fix in `xero-invoices.service.ts` (the `getRetentionLineSpec()` path that grosses up retention to inc-GST when the destination account is GST-applicable and the invoice is Inclusive). The ProCore→SmoothX path is the inverse direction and currently does not gross up.

## 3. Plan A — if client confirms ProCore/SmoothX will fix the bill format

**Scope:** PT only needs to adjust the **consume side** (webhook + import) and the **payments sync** that mirrors retention back to Xero on payment. Producer side is already correct (just shipped).

### A.1 Backend changes (consume side)

`back-end/src/api/common/xero-webhooks/webhook.service.ts` — two near-identical retention computation blocks:

- Lines ~2925-2940 and ~3720-3735 (`retentionAmount = retentionUnitOnly + retentionTaxOnly`)
- Lines ~3273-3283 and ~4077-4085 (`claim_amount`, `retention_amount`, `retention_amount_with_gst`)
- Lines ~5365-5390 and ~7185-7200 (release/sync paths)
- Lines ~8250-8430 (payment-side retention math)

Today the importer assumes Xero retention lines are **ex-GST** and stores:
- `retention_amount` = `retainedAmountExcludingGST`
- `retention_amount_with_gst` = `retentionUnitOnly + retentionTaxOnly` (which today is ≈ ex-GST because the line is BAS-Excluded → tax = 0)

Once SmoothX corrects the bill so the BAS-Excluded retention line carries inc-GST:
1. Detect the new format — the safest signal is **`retention line unit_amount` ≈ `(claim ex-GST × retention%) × 1.1`** rather than relying on tax_type alone.
2. Branch on whether the **base line** has GST applied (`taxAmount > 0` on line 1):
   - GST applies → divide retention line by 1.1 to get `retention_amount` (ex-GST), keep raw value as `retention_amount_with_gst`.
   - No GST on base line → retention line is already ex-GST = inc-GST, no division.
3. Add a feature flag (`xero_retention_inclusive_format`) on the company/integration record so we can switch on per tenant once SmoothX deploys their fix, and roll back instantly if needed.
4. Update the `cash_retention_type` classifier (`classifyRetentionShape`) only if the **release** flow (Retention Claim) layout also changes. Confirm with client whether release bills are affected too.
5. Re-emit a sync log with the new branch taken (so we have an audit trail of which interpretation was applied to each bill).

### A.2 Backend changes (payments mirror)

When PT records a payment on a Billable claim that originated from Xero, the payment is mirrored back into Xero. Current logic (xero-invoices/payments service) already grosses up retention based on the destination account's tax type. **Verify** that for an imported claim where `retention_amount` is now correctly stored ex-GST and `retention_amount_with_gst` is inc-GST, the payment mirror writes the same inc-GST retention liability line back to Xero. Add a unit-style trace log to confirm both directions agree.

### A.3 Migration / backfill

For claims already imported under the old (ex-GST) interpretation:
- Do **not** silently re-interpret historical data. Provide a one-off admin script that lists affected claims (`cash_retention_type='Claim'` + imported from Xero + retention line was BAS-Excluded + base line had GST) and offers per-company opt-in re-import.
- Show the count and dollar impact in admin before running.

### A.4 Tests / verification matrix

| Scenario | Base line GST | Retention line | Expected `retention_amount` | Expected `retention_amount_with_gst` |
|---|---|---|---|---|
| Old format (current) | 10% | 786.20 BAS-Excluded | 786.20 | 786.20 |
| New format (after SmoothX fix) | 10% | 864.82 BAS-Excluded | 786.20 | 864.82 |
| GST-free claim | None | 786.20 BAS-Excluded | 786.20 | 786.20 |
| Inclusive invoice | 10% inc | 864.82 BAS-Excluded | 786.20 | 864.82 |

Run end-to-end on a Demo Company test bill in each scenario.

## 4. Plan B — if client confirms ProCore/SmoothX will NOT fix it

PT must **gross up on import** to keep its internal book correct, and **gross down on payment mirror** so we don't double-write GST back into a bill we didn't author.

- Import: when base line has GST and retention line is BAS-Excluded with `unit_amount` ≈ `(claim ex-GST × ret%)` (the ex-GST shape), set `retention_amount = unit_amount` and `retention_amount_with_gst = unit_amount × 1.1`. PT's internal totals will then be self-consistent (matching today's claim 100015 numbers, which already show 17,217.78).
- Payment mirror: when releasing retention back to a Xero bill that came from ProCore/SmoothX, write the retention release line at the **ex-GST** amount (not inc-GST), tagged with a marker on the claim (`retention_source='external_ex_gst'`) so the mirror knows to match the source bill's convention.
- Same feature flag as A.3, defaulted off initially, enabled per-company once we confirm which integration partner sourced the bill.

## 5. UI clarity — claim & payment pages

Independent of which plan above is actioned, the inc/ex GST ambiguity in the UI needs fixing.

### 5.1 Claim page (`front-end/src/modules/user/AddUpdateClaims/`)

**Files to edit:**
- `DropdownFields.tsx` — the `RETENTION AMOUNT` field
- `FormArrayGrid.tsx` — the GST checkbox + Amount column header
- `HeaderContent.tsx` — the top-right Claim Amount summary

**Changes:**
1. Make the RETENTION AMOUNT label **dynamic** based on the claim's GST flag:
   - GST applicable: `RETENTION AMOUNT (EX-GST)` with a tooltip "Stored ex-GST. Full inc-GST retention held in Xero is `$X.XX`." showing `retention_amount_with_gst`.
   - No GST: `RETENTION AMOUNT` (no suffix).
2. Add a small inline sub-line under the input showing the inc-GST value when GST applies, formatted like `incl. GST: $864.82`.
3. The `AMOUNT (INCLUDING GST)` column header on the line-items grid stays as-is (already explicit), but add a subtle helper label under the GST checkbox: `Tick to apply 10% GST to unit price`.
4. Add a single line near the Claim Summary header that summarises the convention: `Sub-total and retention shown ex-GST. Total includes GST where applicable.` Render only when the claim has any GST line.

### 5.2 Payment page (`front-end/src/modules/user/AddUpdatePayments/` and `OtherPayments/`)

**Files to edit:**
- `ClaimSummary.tsx` (both folders) — the amount fields the user types into
- `PaymentHeaderContent.tsx` — the payment header summary
- `paymentSummaryView.tsx`, `claimSummaryView.tsx` — readonly summaries

**Changes:**
1. The Payment Amount input today is ambiguous. Suffix the label with the same dynamic marker: `PAYMENT AMOUNT (INC-GST)` when the underlying claim has GST, `PAYMENT AMOUNT` otherwise.
2. Below the input, render the breakdown live: `Net: $X.XX • GST: $Y.YY • Total: $Z.ZZ` so the user can see exactly what their typed amount represents. This is the same component pattern already used elsewhere in the app for the claim total row.
3. For retention release / partial payment flows, surface the `retention_amount_with_gst` value next to `retention_amount` so users selecting how much retention to release can see both conventions.
4. Add an info icon next to each ambiguous amount field that opens a one-line explainer — content driven from a single constants file (`AddUpdateClaims.constant.ts` already exists) so we can tweak wording without touching component code.

### 5.3 Convention is dynamic per claim

Drive every label suffix from a single derived flag:

```ts
const isClaimGstInclusive = claim.line_items.some(li => li.gst_applicable);
const amountConvention = isClaimGstInclusive ? 'INC-GST' : '';
```

Centralise in a small hook (`useClaimGstConvention(claim)`) so both Claim and Payment pages read from one source of truth. No backend change required for the UI work.

## 6. Sequencing & estimates

| Step | Trigger | Effort | Risk |
|---|---|---|---|
| 5 — UI clarity | Can start immediately, no client dependency | ~½ day | Low |
| Plan A backend | After client confirms SmoothX will fix + ships fix | ~1 day + test matrix | Medium (feature-flag gated) |
| Plan B backend | After client confirms SmoothX will NOT fix | ~1 day + backfill | Medium (need source-tagging on existing claims) |
| Backfill / re-import script | After A or B lands | ~½ day | Medium (run per-company) |

## 7. Decision points to lock in with client tomorrow

1. Will SmoothX/ProCore correct the bill so the BAS-Excluded retention line carries the **inc-GST** amount? (drives A vs B)
2. Does the same correction apply to retention **release** bills, or only to the original retention-held bills?
3. Are there other tenants on the same SmoothX integration that would be affected by the same change?
4. Confirm we can add a per-company feature flag rather than a global cutover.
5. Sign-off on the dynamic UI label wording in §5 (so we ship that immediately, regardless of A/B outcome).
