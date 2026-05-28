# Xero Retention Bill — Inbound Import Verification

Executable verification of the inbound Xero → PT import path for 3-line ACCPAY retention bills (base `bill_code` + `liability_payable_code` + `retention_payable_retained_code`, tax types `INPUT` + `BASEXCLUDED`). Each verdict is backed by a per-scenario fixture under `back-end/test/fixtures/xero/` and was produced by running the actual compiled production code (`back-end/dist/...`) against those fixtures. The captured numerical output is committed at `back-end/test/fixtures/xero/.verification-output.log` and is reproducible by anyone:

```
node back-end/test/run-retention-bill-import-verification.js
```

The harness exercises the real production functions:

- `XeroWebhookService.classifyRetentionShape` (static, `back-end/src/api/common/xero-webhooks/webhook.service.ts:336`)
- `XeroInvoicesService.adjustItemsWithRetention` (`back-end/src/api/common/integrations/xero/invoicesAndBills/xero-invoices.service.ts:3444`)
- `XeroInvoicesService.mapItemsDirectly` (`back-end/src/api/common/integrations/xero/invoicesAndBills/xero-invoices.service.ts:3195`)
- The inline retention reducer at `webhook.service.ts:3727-3760`, replicated verbatim in the harness with a citation comment so any production drift will diverge detectably.

## One honest caveat

The harness exercises the *math layer* — classifier, reducer, and the line-merge functions — against fixtures. It does **not** bootstrap the full Nest application, seed dev-DB rows (company / contact / project / contract / supplier overrides), or round-trip an actual Xero tenant via `getInvoice`. Two parts of the importer can only be confirmed end-to-end against a live Xero org:

- The `validateAndProcessWebhookInvoice` orchestration (DB writes for `xero_invoices_bills`, `payment_claims`, `payment_claim_invoices`, supplier-default learning side effects).
- Scenario 5's Stage 2 payment walk (`checkAndProcessPayment` at `webhook.service.ts:5346-5354`), which writes a PT payment and may push a retention trust-leg.

Those are called out explicitly per scenario below and noted as the remaining live-replay work.

The dispatch chain for a `needs_import` ACCPAY row from the catch-up dialog is:

```
manualXeroTwoSidedSync   (webhook.service.ts:18768)
  └── manualXeroResync   (webhook.service.ts:13759)        # direction = 'import'
       └── handleInvoiceCreateUpdate   (webhook.service.ts:1509)
            └── validateAndProcessWebhookInvoice   (webhook.service.ts:1695)
```

`sync_run_type='manual'` flows through the whole chain so the deferred BullMQ wait-queue path is skipped (`webhook.service.ts:5300-5325`) and Stage 2 (payment walk) runs inline.

## Scenarios

### Scenario 1 — ex-GST mode, payable side, 3-line shape

**Fixture**: `back-end/test/fixtures/xero/retention-bill-scenario-1-expay-3line-authorised.json`.

`lineAmountTypes=Exclusive`, `retention_recording_mode='ex_gst'`, `simplified_retention_accounting=false`. Base line on `bill_code=300` ($14,937.80 + $1,493.78 GST, INPUT), liability on `831` (+$786.20 BASEXCLUDED), retained on `832` (-$786.20 BASEXCLUDED). Header totals net-of-retention: `subTotal=14937.80, totalTax=1493.78, total=16431.58`.

**Captured output**:

```
classifier: { retentionClaimnlineItem: false, lineItem1: true, lineItem2: true,
              hasBaseLine: true, netRetainedSigned: -786.2, codesShared: true }
reducer:    { retentionLineCount: 1, retentionUnitOnly: 786.20,
              retentionTaxOnly: 0, retentionAmount: 786.20 }
adjustItemsWithRetention output:
  [{ unit_price: 15724, gst: 1572.40, total_amount_including_gst: 17296.40,
     description: "Project works — May 2026 progress claim", quantity: 1 }]
```

**Trace** (the code under test):

1. `classifyRetentionShape` returns `hasBaseLine=true`, `netRetainedSigned=-786.20`, `retentionClaimnlineItem=false` (the `!hasBaseLine` clause at `webhook.service.ts:388` short-circuits). The 2-line guard's XOR is `true XOR true = false`, so the guard passes.
2. The retention reducer at `webhook.service.ts:3748-3760` filters to the retained-code line only (the allowlist at `webhook.service.ts:3727-3736` excludes the liability line). Exclusive branch: `unitExGst = |u| - |t| = 786.20 - 0`. Result: `retentionUnitOnly=786.20, retentionTaxOnly=0`.
3. `adjustItemsWithRetention` uses `totalOriginal = subTotal + totalTax = 16431.58` (gross) and `lineAmount` for Exclusive is `unitAmount*qty + taxAmount = 14937.80 + 1493.78 = 16431.58` (also gross). Both sides of `itemRatio` are gross, so `itemRatio = 1.0` and the full $786.20 retention is recovered into the merged unit. `workLineRate = 1493.78 / 14937.80 = 0.10` applies cleanly to the new $15,724.00 base.

**Verdict**: ✓ **verified clean.** Output reproduces the worked-example block at `xero-invoices.service.ts:3526-3534` to the cent. `cash_retention` is set to `true` and `cash_retention_type='Claim'` (`webhook.service.ts:3475`). The supplier per-account override path is not reachable for retention/liability lines because the known-codes allowlist at `webhook.service.ts:482-494` excludes them. Sync log captures the **response** invoice in `xero_records: [invoice]` (`webhook.service.ts:4200`), satisfying the [sync-log-response memory rule](../../.agents/memory/xero-sync-log-capture-response.md).

What this scenario does **not** cover (genuinely needs a live replay): the actual DB write of `payment_claims` + `payment_claim_invoices`, the supplier-default learning side effects, and any per-contract config that affects which PT contract the import binds to.

### Scenario 2 — inc-GST mode, payable side, 2-line shape (simplified)

**Fixture**: `back-end/test/fixtures/xero/retention-bill-scenario-2-incgst-simplified-2line.json`. `simplified_retention_accounting=true`, `retention_recording_mode='inc_gst'`, `lineAmountTypes='Inclusive'`.

**Captured output**:

```
classifier: { retentionClaimnlineItem: false, lineItem1: true, lineItem2: false,
              hasBaseLine: true, netRetainedSigned: -786.2, codesShared: true }
reducer:    { retentionLineCount: 1, retentionUnitOnly: 714.7273,
              retentionTaxOnly: 71.4727, retentionAmount: 786.20 }
mapItemsDirectly output:
  [{ unit_price: 14937.80, gst: 1493.78, total_amount_including_gst: 16431.58,
     description: "Project works — May 2026 (gross)", quantity: 1 }]
```

**Trace**: 2-line guard at `webhook.service.ts:3445` is **bypassed** because `webhookSimplifiedRetention=true`. `vUseIncGstSplit=true` correctly recovers the ex-GST/GST split from the gross retained line: `714.73 + 71.47 ≈ 786.20`. `cashRetention && webhookSimplifiedRetention` routes to `mapItemsDirectly` (`webhook.service.ts:3804-3808`), which preserves the base line at `14937.80 + 1493.78 GST = 16431.58` — Xero-header-consistent.

**Verdict**: ✓ **verified clean.** No math wrinkle. Sync log captures `[invoice]` as the response. Supplier per-account override path not reachable for retention lines.

### Scenario 3 — ex-GST mode, receivable side, 3-line shape

**Fixture**: `back-end/test/fixtures/xero/retention-bill-scenario-3-exgst-accrec-3line.json`. `type='ACCREC'`, base on `invoice_code=200` (OUTPUT), receivable retention on `833`, receivable liability on `834`.

**Captured output**:

```
classifier: { retentionClaimnlineItem: false, lineItem1: true, lineItem2: true,
              hasBaseLine: true, netRetainedSigned: -786.2, codesShared: true }
reducer:    { retentionLineCount: 1, retentionUnitOnly: 786.20,
              retentionTaxOnly: 0, retentionAmount: 786.20 }
adjustItemsWithRetention output:
  [{ unit_price: 15724, gst: 1572.40, total_amount_including_gst: 17296.40,
     description: "Project works — May 2026 progress claim", quantity: 1 }]
```

**Trace**: `classifyRetentionShape` resolves to the receivable-side codes via the `isAccPay` branch at `webhook.service.ts:344-356`, so the rest is symmetric to Scenario 1. The reducer correctly includes `retention_receivable_retained_code` in its allowlist. Variable-bill-code path is ACCPAY-gated (`webhook.service.ts:3788-3796`) and therefore does not fire for ACCREC — `vBaseAccountCode` is just `xeroDetails.invoice_code`.

**Verdict**: ✓ **math verified clean** — same correct numbers as Scenario 1. ⚠ **operator-facing UX gap** the harness does not exercise: the full ACCREC branch in `validateAndProcessWebhookInvoice` runs S75 / supporting-statement validations at `webhook.service.ts:3845-3981`, which can hard-fail the import for head-contractor companies when the catch-up dialog hasn't supplied `claims_with_reason` / `compulsory_attachment_ids`. Operators running an ACCREC retention bill from "Run sync" without those fields will see an `Import failed` row with a generic "Missing reason for non-paid claim(s)" or "Missing supporting statement attachments" message rather than a pre-flight block.

**Proposed follow-up task (#337)**: Add the S75 head-contractor / supporting-statement preconditions to `manualXeroPreflight` for ACCREC `invoice_bill` records as typed checks.

### Scenario 4 — retained-code nets to zero across multiple sub-lines

**Fixture**: `back-end/test/fixtures/xero/retention-bill-scenario-4-nets-to-zero.json`. Two offsetting lines on `accountCode=832`: `-$1,000.00` and `+$1,000.00`.

**Captured output**:

```
classifier: { retentionClaimnlineItem: false, lineItem1: true, lineItem2: false,
              hasBaseLine: true, netRetainedSigned: 0, codesShared: true }
reducer:    { retentionLineCount: 2, retentionUnitOnly: 2000,
              retentionTaxOnly: 0, retentionAmount: 2000 }
signed sum of retained-code lines (economically correct retention): 0
```

**Trace**:

1. `classifyRetentionShape` correctly computes `netRetainedSigned = 0` (signed sum), and because `hasBaseLine=true` the `retentionClaimnlineItem` predicate stays `false` (Option C release requires `!hasBaseLine`).
2. The reducer at `webhook.service.ts:3748-3760` sums `Math.abs(unitAmount)` per retained line: `|−1000| + |+1000| = 2000`. So `retentionAmount = 2000` on a bill with **zero** economic retention. `cashRetention` flips to `true` and the PT claim will carry $2,000 of phantom retention that the operator has to manually delete.

**Verdict**: ⚠ **verified failure on the nets-to-zero edge — REAL BUG.** The reducer's `Math.abs`-per-line is direction-blind. The fix is to sum signed amounts and then take `|sum|` (or skip the retention path entirely when the signed sum rounds to zero). Producer side (`getRetentionLineSpec`) never emits offsetting sub-lines, so this is consumer-only — only triggers when a human user or another tool authored the Xero bill with retention adjustments.

**Proposed follow-up task (#336)**: Replace the `|unitAmount|` reducer at `webhook.service.ts:3748-3760` and its D-Step mirror at `4561-4573` with a signed-sum-then-abs reduction in both the standard and `vUseIncGstSplit` branches. Add a Jest spec against the existing fixture asserting `retention_amount === 0` and `cash_retention === false`.

### Scenario 5 — Xero bill already PAID before import

**Fixture**: `back-end/test/fixtures/xero/retention-bill-scenario-5-paid.json`. Same shape as Scenario 1 with `status=PAID` and one payment leg of $16,431.58 on 2026-05-10.

**Captured output** (Stage 1):

```
classifier: { retentionClaimnlineItem: false, lineItem1: true, lineItem2: true,
              hasBaseLine: true, netRetainedSigned: -786.2, codesShared: true }
reducer:    { retentionLineCount: 1, retentionUnitOnly: 786.20,
              retentionTaxOnly: 0, retentionAmount: 786.20 }
adjustItemsWithRetention output:
  [{ unit_price: 15724, gst: 1572.40, total_amount_including_gst: 17296.40, ... }]
payments in fixture: [{ paymentID, date: 2026-05-10, amount: 16431.58, account: { accountID }}]
```

**Trace**:

1. Stage 1 is byte-identical to Scenario 1 — verified clean.
2. The manual short-circuit at `webhook.service.ts:5300-5325` (`sync_run_type !== 'manual'` is the defer condition) keeps the payment walk inline.
3. Stage 2 calls `checkAndProcessPayment` (`webhook.service.ts:5346-5354`), which iterates `invoice.payments[]` and dispatches each through `paymentsService.addPayment`. A throw inside Stage 2 is caught locally (`webhook.service.ts:5356-5360`) so Stage 1's "Import successful" trigger row is not retroactively poisoned — payment-side issues land as their own per-payment sync log rows.
4. Because `cash_retention=true`, the PT payment creation path is expected to also produce a retention trust-account leg via `XeroPaymentsService` (see `docs/architecture/xero-trust-movements-sync.md` for the outbound `PT-MOV-{id}` BankTransfer shape). The trust-leg producer requires `payment_details.retention_account` to be set, which depends on the PT contract's default retention bank account — there is no per-bill data in the Xero payload that sets it.

**Verdict**: ✓ **Stage 1 verified clean** (matches Scenario 1 to the cent). ⚠ **Stage 2 trace-verified, needs-live-confirm**: the exact behaviour of the trust-leg push when the contract has no default retention account, or when the operator's bank account mapping is incomplete, cannot be confirmed from the harness alone — it needs a live import to verify whether Stage 2 silently no-ops, writes a clear per-payment failure log, or produces a half-completed payment with an unconfirmed retention leg. This is the most likely place for a real-world operator complaint.

**Proposed follow-up task** (optional, only if live confirmation finds a gap): Add a pre-flight check to `manualXeroPreflight` that, for `invoice_bill` records with `cash_retention=true` and `status=PAID`, validates the resolved PT contract has a default retention bank account mapping.

## Cross-cutting findings

- **The math layer of the importer is correct on every "good shape" exercised here.** Scenarios 1, 2, 3, and 5's Stage 1 all produce the exact numbers the worked-example comments and Xero header totals imply.
- **Sync log capture is correct** on the code paths inspected — `webhook.service.ts:4164-4205` (V-Step) and `:5074` (D-Step) write `xero_records: [invoice]` from the live `getInvoice` response, with the request context in `api_payload` only.
- **Supplier per-account override path is not reachable for retention/liability lines** — the known-codes allowlist at `webhook.service.ts:482-494` excludes them from candidate discovery, and `filteredInvoices` at `webhook.service.ts:3801` only picks lines whose `accountCode === resolved bill_code`.
- **The 2-line guard cannot false-trigger on a 3-line shape** (both `lineItem1` and `lineItem2` are `true` → XOR is `false` → guard passes). Correctly bypassed under `simplified_retention_accounting=true` for both V-Step (`webhook.service.ts:3445`) and D-Step (`webhook.service.ts:4228`).
- **`retention_recording_mode` is honoured on the inbound side** at V-Step `webhook.service.ts:3745-3760` and D-Step `webhook.service.ts:4558-4573`. The split logic matches the producer guarantees in `xero-retention-recording-mode-phase-1.md`.

## Summary of verdicts

| # | Scenario | Verdict | Real importer bug? |
|---|---|---|---|
| 1 | Ex-GST, payable, 3-line | ✓ verified clean (15724.00 + 1572.40 = 17296.40) | No |
| 2 | Inc-GST, payable, simplified 2-line | ✓ verified clean | No |
| 3 | Ex-GST, receivable, 3-line | ✓ math verified clean; S75 preconditions not surfaced in pre-flight | UX gap (#337), not an importer bug |
| 4 | Retained nets to zero across sub-lines | ⚠ verified failure (reports $2,000 on zero retention) | **Yes** (#336) — `Math.abs` reducer over-counts offsetting retention |
| 5 | Xero bill already PAID | ✓ Stage 1 clean; Stage 2 trust leg needs live confirm | Likely operator-config gap, not a code bug |

**Net answer to the task question** ("Are retention bills actually importing cleanly end-to-end?"): For the clean shapes operators encounter in normal use — ex-GST payable, inc-GST simplified, ex-GST receivable, and PAID bills — yes, the import math is correct and the catch-up dialog's existing validator wording fix was the right call. There is one real consumer-side bug (Scenario 4, abs-reducer over-counting offsetting retention adjustments) and one UX gap (Scenario 3 ACCREC preconditions). Stage 2 of Scenario 5 is the only remaining piece that genuinely needs a live-org reproduction to sign off on.
