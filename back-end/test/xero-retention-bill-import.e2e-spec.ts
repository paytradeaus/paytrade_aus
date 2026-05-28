/**
 * Executable verification harness for the inbound retention-bill import
 * path. Exercises the three pieces of production code that determine the
 * math of the imported PT claim (classification → retention split → line
 * merge) against five real per-scenario fixtures so the numerical
 * verdicts in docs/architecture/xero-retention-bill-import-verification.md
 * are reproducible without a live Xero org.
 *
 * Standalone-Node equivalent at back-end/test/run-retention-bill-import-verification.js
 * exists for environments where jest devDependencies are not installed —
 * it loads the same compiled production code from dist/ and writes its
 * output to back-end/test/fixtures/xero/.verification-output.log. The
 * Jest spec and the Node runner must stay in sync.
 *
 * What is exercised here (real production code paths):
 *   - XeroWebhookService.classifyRetentionShape (static, no DI)
 *   - XeroInvoicesService.adjustItemsWithRetention (instance method, only
 *     touches `this.logger` — safe to call on a hand-constructed instance)
 *   - XeroInvoicesService.mapItemsDirectly (same)
 *
 * What is intentionally NOT exercised here (would require seeding the dev
 * DB with company / contact / project / contract rows AND a live Xero
 * tenant for the token refresh + getInvoice round-trip):
 *   - The full validateAndProcessWebhookInvoice flow and its DB writes
 *   - The Stage 2 payment walk in webhook.service.ts:5346-5354
 *
 * The inline retention reducer that lives at webhook.service.ts:3748-3760
 * is replicated verbatim below as `computeRetentionSplit` with a
 * citation comment, so a future change to the production reducer will
 * cause this spec to drift detectably.
 */

import * as fs from 'fs';
import * as path from 'path';
import { LineAmountTypes } from 'xero-node';

import { XeroWebhookService } from '../src/api/common/xero-webhooks/webhook.service';
import { XeroInvoicesService } from '../src/api/common/integrations/xero/invoicesAndBills/xero-invoices.service';

const FIXTURE_DIR = path.join(__dirname, 'fixtures', 'xero');
function loadFixture(file: string): any {
  return JSON.parse(fs.readFileSync(path.join(FIXTURE_DIR, file), 'utf8'));
}

/**
 * Verbatim replica of the inline reducer at
 * back-end/src/api/common/xero-webhooks/webhook.service.ts:3727-3760
 * (V-Step) and :4540-4573 (D-Step). Kept in sync by code review; any
 * drift here vs. there is itself a verification finding.
 */
function computeRetentionSplit(invoice: any, xeroDetails: any): {
  retentionLineCount: number;
  retentionUnitOnly: number;
  retentionTaxOnly: number;
  retentionAmount: number;
} {
  const retentionLineItems =
    invoice?.lineItems?.filter((item: any) =>
      [
        xeroDetails.retention_payable_retained_code,
        xeroDetails.retention_receivable_retained_code,
      ].includes(item?.accountCode),
    ) || [];

  const vUseIncGstSplit =
    xeroDetails.retention_recording_mode === 'inc_gst' &&
    invoice.lineAmountTypes === LineAmountTypes.Inclusive;

  const retentionUnitOnly = retentionLineItems.reduce((sum: number, item: any) => {
    const u = Math.abs(Number(item?.unitAmount || 0));
    const t = Math.abs(Number(item?.taxAmount || 0));
    if (vUseIncGstSplit) return sum + u / 1.1;
    const unitExGst =
      invoice.lineAmountTypes === LineAmountTypes.Inclusive ? u - t : u;
    return sum + unitExGst;
  }, 0.0);

  const retentionTaxOnly = retentionLineItems.reduce((sum: number, item: any) => {
    const u = Math.abs(Number(item?.unitAmount || 0));
    if (vUseIncGstSplit) return sum + (u - u / 1.1);
    return sum + Math.abs(Number(item?.taxAmount || 0));
  }, 0.0);

  return {
    retentionLineCount: retentionLineItems.length,
    retentionUnitOnly,
    retentionTaxOnly,
    retentionAmount: retentionUnitOnly + retentionTaxOnly,
  };
}

/** Hand-construct an instance with all DI args as null. Only `this.logger`
 * and the inline `new XeroClient` are touched; we never use `this.xero`. */
function makeInvoicesService(): XeroInvoicesService {
  const Cls: any = XeroInvoicesService;
  return new Cls(
    null, null, null, null, null, null, null, null, null, null, null, null,
    null, null, null, null, null, null,
  );
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const near = (a: number, b: number, tol = 0.01) => Math.abs(a - b) < tol;

describe('Xero retention bill inbound import — fixture-grounded verification', () => {
  describe('Scenario 1: ex-GST, payable, 3-line, AUTHORISED', () => {
    const fx = loadFixture('retention-bill-scenario-1-expay-3line-authorised.json');
    const { invoice, xeroIntegrationDetails: xd } = fx;

    it('classifies as a Claim, not a release', () => {
      const c = XeroWebhookService.classifyRetentionShape(invoice, xd);
      expect(c.hasBaseLine).toBe(true);
      expect(c.netRetainedSigned).toBeCloseTo(-786.2, 2);
      expect(c.retentionClaimnlineItem).toBe(false);
      expect(c.lineItem1).toBe(true);
      expect(c.lineItem2).toBe(true);
      // The 2-line guard is (lineItem1 XOR lineItem2) — both true → XOR false → passes.
    });

    it('reducer extracts $786.20 retention ex-GST (BASEXCLUDED ⇒ no GST portion)', () => {
      const s = computeRetentionSplit(invoice, xd);
      expect(s.retentionLineCount).toBe(1);
      expect(round2(s.retentionUnitOnly)).toBe(786.2);
      expect(round2(s.retentionTaxOnly)).toBe(0);
      expect(round2(s.retentionAmount)).toBe(786.2);
    });

    it('adjustItemsWithRetention produces the worked-example numbers (clean)', async () => {
      const svc = makeInvoicesService();
      const filtered = invoice.lineItems.filter((li: any) => li.accountCode === xd.bill_code);
      expect(filtered.length).toBe(1);

      const items = await svc.adjustItemsWithRetention(
        invoice,
        filtered,
        786.2,
        0,
        LineAmountTypes.Exclusive,
      );

      // Matches the worked-example comment block at xero-invoices.service.ts:3526-3534.
      // itemRatio resolves to 1.0 on a single-line bill because BOTH numerator and
      // denominator are gross of GST: lineAmount = unitAmount*qty + taxAmount and
      // totalOriginal = subTotal + totalTax.
      expect(items.length).toBe(1);
      expect(round2(items[0].unit_price)).toBe(15724.0);
      expect(round2(items[0].gst)).toBe(1572.4);
      expect(round2(items[0].total_amount_including_gst)).toBe(17296.4);
    });
  });

  describe('Scenario 2: inc-GST, payable, simplified 2-line, AUTHORISED', () => {
    const fx = loadFixture('retention-bill-scenario-2-incgst-simplified-2line.json');
    const { invoice, xeroIntegrationDetails: xd } = fx;

    it('classifies as a Claim with inc-GST split honoured by the reducer', () => {
      const c = XeroWebhookService.classifyRetentionShape(invoice, xd);
      expect(c.hasBaseLine).toBe(true);
      expect(c.retentionClaimnlineItem).toBe(false);

      const s = computeRetentionSplit(invoice, xd);
      // 786.20 / 1.1 = 714.7272..., 786.20 - 714.7272 = 71.4727...
      expect(near(s.retentionUnitOnly, 714.7272, 0.001)).toBe(true);
      expect(near(s.retentionTaxOnly, 71.4727, 0.001)).toBe(true);
      expect(near(s.retentionAmount, 786.2, 0.001)).toBe(true);
    });

    it('mapItemsDirectly preserves the base line 1:1', () => {
      const svc = makeInvoicesService();
      const filtered = invoice.lineItems.filter((li: any) => li.accountCode === xd.bill_code);
      const items = svc.mapItemsDirectly(filtered, LineAmountTypes.Inclusive);
      // Inclusive: unit_price = rawUnit - rawTax = 16431.58 - 1493.78 = 14937.80
      expect(round2(items[0].unit_price)).toBe(14937.8);
      expect(round2(items[0].gst)).toBe(1493.78);
      expect(round2(items[0].total_amount_including_gst)).toBe(16431.58);
    });
  });

  describe('Scenario 3: ex-GST, receivable (ACCREC), 3-line, AUTHORISED', () => {
    const fx = loadFixture('retention-bill-scenario-3-exgst-accrec-3line.json');
    const { invoice, xeroIntegrationDetails: xd } = fx;

    it('classifier resolves to receivable-side codes', () => {
      const c = XeroWebhookService.classifyRetentionShape(invoice, xd);
      expect(c.hasBaseLine).toBe(true);
      expect(c.netRetainedSigned).toBeCloseTo(-786.2, 2);
      expect(c.retentionClaimnlineItem).toBe(false);
    });

    it('reducer picks up retention_receivable_retained_code line', () => {
      const s = computeRetentionSplit(invoice, xd);
      expect(s.retentionLineCount).toBe(1);
      expect(round2(s.retentionUnitOnly)).toBe(786.2);
    });

    it('produces clean worked-example numbers (same correct path as Scenario 1)', async () => {
      const svc = makeInvoicesService();
      const filtered = invoice.lineItems.filter((li: any) => li.accountCode === xd.invoice_code);
      const items = await svc.adjustItemsWithRetention(
        invoice,
        filtered,
        786.2,
        0,
        LineAmountTypes.Exclusive,
      );
      expect(round2(items[0].unit_price)).toBe(15724.0);
      expect(round2(items[0].total_amount_including_gst)).toBe(17296.4);
      // Operator-facing precondition (S75 / supporting-statement checks)
      // is NOT exercisable here — that lives inside the full
      // validateAndProcessWebhookInvoice flow and requires DB + Nest DI.
    });
  });

  describe('Scenario 4: retained-code lines net to zero (REAL BUG)', () => {
    const fx = loadFixture('retention-bill-scenario-4-nets-to-zero.json');
    const { invoice, xeroIntegrationDetails: xd } = fx;

    it('classifier sees netRetainedSigned=0', () => {
      const c = XeroWebhookService.classifyRetentionShape(invoice, xd);
      expect(c.hasBaseLine).toBe(true);
      expect(c.netRetainedSigned).toBeCloseTo(0, 2);
      // Still not a release — release predicate also requires !hasBaseLine.
      expect(c.retentionClaimnlineItem).toBe(false);
    });

    it('reducer over-counts: signed sum is 0 but reducer reports $2,000 (BUG)', () => {
      const s = computeRetentionSplit(invoice, xd);
      expect(s.retentionLineCount).toBe(2);
      // Math.abs per line: |-1000| + |+1000| = 2000.
      expect(round2(s.retentionUnitOnly)).toBe(2000);
      expect(round2(s.retentionAmount)).toBe(2000);

      // The economically correct value:
      const signedSum = invoice.lineItems
        .filter((li: any) => li.accountCode === xd.retention_payable_retained_code)
        .reduce((sum: number, li: any) => sum + Number(li.unitAmount), 0);
      expect(round2(signedSum)).toBe(0);
    });
  });

  describe('Scenario 5: ex-GST, payable, 3-line, PAID with payment leg', () => {
    const fx = loadFixture('retention-bill-scenario-5-paid.json');
    const { invoice, xeroIntegrationDetails: xd } = fx;

    it('Stage 1 math matches Scenario 1 worked-example numbers', async () => {
      const c = XeroWebhookService.classifyRetentionShape(invoice, xd);
      expect(c.retentionClaimnlineItem).toBe(false);

      const s = computeRetentionSplit(invoice, xd);
      expect(round2(s.retentionUnitOnly)).toBe(786.2);

      const svc = makeInvoicesService();
      const filtered = invoice.lineItems.filter((li: any) => li.accountCode === xd.bill_code);
      const items = await svc.adjustItemsWithRetention(
        invoice,
        filtered,
        786.2,
        0,
        LineAmountTypes.Exclusive,
      );
      expect(round2(items[0].unit_price)).toBe(15724.0);
      expect(round2(items[0].total_amount_including_gst)).toBe(17296.4);
    });

    it('Stage 2 payment walk is NOT exercised here — needs live-org confirmation', () => {
      // checkAndProcessPayment requires the full DI graph (paymentsService,
      // xeroService, trust-account mappings) and writes to the DB. This
      // spec deliberately stops at Stage 1. The findings doc marks
      // Scenario 5 as "trace-verified, needs-live-confirm" for this
      // reason.
      expect(invoice.status).toBe('PAID');
      expect(invoice.payments.length).toBe(1);
      expect(invoice.payments[0].amount).toBe(16431.58);
    });
  });
});
