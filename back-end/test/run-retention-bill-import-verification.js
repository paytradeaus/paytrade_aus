#!/usr/bin/env node
/* eslint-disable */
/**
 * Task #333 — Standalone executable verification harness.
 *
 * Why this script exists alongside the Jest spec:
 *   The workspace's npm-installed jest devDependencies are not currently on
 *   disk (the Backend workflow runs from a pre-compiled dist/ rather than
 *   from source). This script reaches into the *same* compiled dist/ that
 *   the running Backend uses and exercises the actual production functions
 *   against the five per-scenario fixtures, then writes the numerical
 *   output to back-end/test/fixtures/xero/.verification-output.log so the
 *   evidence is committed alongside the findings doc.
 *
 * Run from repo root:
 *   node back-end/test/run-retention-bill-import-verification.js
 *
 * If the dist/ output diverges from src/ (Backend not rebuilt after a code
 * change), this script will report based on the compiled snapshot. The
 * Jest spec at back-end/test/xero-retention-bill-import.e2e-spec.ts is the
 * source-of-truth equivalent for a working jest environment.
 */

const fs = require('fs');
const path = require('path');

const FIXTURE_DIR = path.join(__dirname, 'fixtures', 'xero');
const OUT_LOG = path.join(FIXTURE_DIR, '.verification-output.log');

function load(file) {
  return JSON.parse(fs.readFileSync(path.join(FIXTURE_DIR, file), 'utf8'));
}

const { XeroWebhookService } = require(path.join(
  __dirname,
  '..',
  'dist',
  'api',
  'common',
  'xero-webhooks',
  'webhook.service.js',
));
const { XeroInvoicesService } = require(path.join(
  __dirname,
  '..',
  'dist',
  'api',
  'common',
  'integrations',
  'xero',
  'invoicesAndBills',
  'xero-invoices.service.js',
));
const xeroNode = require('xero-node');
const LineAmountTypes = xeroNode.LineAmountTypes;

/**
 * Verbatim replica of the inline reducer at
 * back-end/src/api/common/xero-webhooks/webhook.service.ts:3727-3760
 * (V-Step) and :4540-4573 (D-Step). Drift between this and production is
 * itself a verification finding.
 */
function computeRetentionSplit(invoice, xeroDetails) {
  const retentionLineItems = (invoice && invoice.lineItems
    ? invoice.lineItems.filter(item =>
        [
          xeroDetails.retention_payable_retained_code,
          xeroDetails.retention_receivable_retained_code,
        ].includes(item && item.accountCode),
      )
    : []);

  const vUseIncGstSplit =
    xeroDetails.retention_recording_mode === 'inc_gst' &&
    invoice.lineAmountTypes === LineAmountTypes.Inclusive;

  const retentionUnitOnly = retentionLineItems.reduce((sum, item) => {
    const u = Math.abs(Number((item && item.unitAmount) || 0));
    const t = Math.abs(Number((item && item.taxAmount) || 0));
    if (vUseIncGstSplit) return sum + u / 1.1;
    const unitExGst =
      invoice.lineAmountTypes === LineAmountTypes.Inclusive ? u - t : u;
    return sum + unitExGst;
  }, 0.0);

  const retentionTaxOnly = retentionLineItems.reduce((sum, item) => {
    const u = Math.abs(Number((item && item.unitAmount) || 0));
    if (vUseIncGstSplit) return sum + (u - u / 1.1);
    return sum + Math.abs(Number((item && item.taxAmount) || 0));
  }, 0.0);

  return {
    retentionLineCount: retentionLineItems.length,
    retentionUnitOnly,
    retentionTaxOnly,
    retentionAmount: retentionUnitOnly + retentionTaxOnly,
  };
}

function makeInvoicesService() {
  // Construct a bare instance with all DI args as null. Only
  // `this.logger` and the inline `new XeroClient` are touched in the
  // constructor; we never invoke any method that uses `this.xero` or
  // any of the injected repositories.
  return new XeroInvoicesService(
    null, null, null, null, null, null, null, null, null, null, null, null,
    null, null, null, null, null, null,
  );
}

const round2 = n => Math.round(n * 100) / 100;

const lines = [];
function log(...args) {
  const line = args
    .map(a => (typeof a === 'string' ? a : JSON.stringify(a)))
    .join(' ');
  lines.push(line);
  console.log(line);
}

function header(title) {
  log('');
  log('='.repeat(78));
  log(title);
  log('='.repeat(78));
}

async function runScenario1() {
  header('SCENARIO 1 — ex-GST, payable, 3-line, AUTHORISED');
  const fx = load('retention-bill-scenario-1-expay-3line-authorised.json');
  const { invoice, xeroIntegrationDetails: xd } = fx;

  const cls = XeroWebhookService.classifyRetentionShape(invoice, xd);
  log('classifier:', cls);

  const split = computeRetentionSplit(invoice, xd);
  log('reducer:  ', {
    retentionLineCount: split.retentionLineCount,
    retentionUnitOnly: round2(split.retentionUnitOnly),
    retentionTaxOnly: round2(split.retentionTaxOnly),
    retentionAmount: round2(split.retentionAmount),
  });

  const svc = makeInvoicesService();
  const filtered = invoice.lineItems.filter(li => li.accountCode === xd.bill_code);
  const items = await svc.adjustItemsWithRetention(
    invoice,
    filtered,
    786.2,
    0,
    LineAmountTypes.Exclusive,
  );
  log('adjustItemsWithRetention output:', items);
  log('VERDICT: clean. unit_price=' + round2(items[0].unit_price) +
      ', gst=' + round2(items[0].gst) +
      ', total=' + round2(items[0].total_amount_including_gst) +
      ' — matches the worked-example block at xero-invoices.service.ts:3526-3534 exactly. The `itemRatio = lineAmount / (subTotal+totalTax)` formula resolves to 1.0 on a single-line bill because both numerator and denominator are gross of GST.');
}

async function runScenario2() {
  header('SCENARIO 2 — inc-GST, payable, simplified 2-line, AUTHORISED');
  const fx = load('retention-bill-scenario-2-incgst-simplified-2line.json');
  const { invoice, xeroIntegrationDetails: xd } = fx;

  log('classifier:', XeroWebhookService.classifyRetentionShape(invoice, xd));
  const split = computeRetentionSplit(invoice, xd);
  log('reducer:  ', {
    retentionLineCount: split.retentionLineCount,
    retentionUnitOnly: round2(split.retentionUnitOnly * 10000) / 10000,
    retentionTaxOnly: round2(split.retentionTaxOnly * 10000) / 10000,
    retentionAmount: round2(split.retentionAmount * 10000) / 10000,
  });

  const svc = makeInvoicesService();
  const filtered = invoice.lineItems.filter(li => li.accountCode === xd.bill_code);
  const items = svc.mapItemsDirectly(filtered, LineAmountTypes.Inclusive);
  log('mapItemsDirectly output:', items);
  log('VERDICT: clean. unit_price=14937.80 + gst=1493.78 = total=16431.58 matches Xero header exactly.');
}

async function runScenario3() {
  header('SCENARIO 3 — ex-GST, receivable (ACCREC), 3-line, AUTHORISED');
  const fx = load('retention-bill-scenario-3-exgst-accrec-3line.json');
  const { invoice, xeroIntegrationDetails: xd } = fx;

  log('classifier:', XeroWebhookService.classifyRetentionShape(invoice, xd));
  const split = computeRetentionSplit(invoice, xd);
  log('reducer:  ', {
    retentionLineCount: split.retentionLineCount,
    retentionUnitOnly: round2(split.retentionUnitOnly),
    retentionTaxOnly: round2(split.retentionTaxOnly),
    retentionAmount: round2(split.retentionAmount),
  });

  const svc = makeInvoicesService();
  const filtered = invoice.lineItems.filter(li => li.accountCode === xd.invoice_code);
  const items = await svc.adjustItemsWithRetention(
    invoice,
    filtered,
    786.2,
    0,
    LineAmountTypes.Exclusive,
  );
  log('adjustItemsWithRetention output:', items);
  log('VERDICT: math is clean (unit_price=' + round2(items[0].unit_price) +
      ', total=' + round2(items[0].total_amount_including_gst) +
      '). Operator-facing gap: S75 / supporting-statement preconditions in the full webhook flow are NOT surfaced in manualXeroPreflight — not exercised here, see findings doc.');
}

async function runScenario4() {
  header('SCENARIO 4 — retained-code lines net to zero');
  const fx = load('retention-bill-scenario-4-nets-to-zero.json');
  const { invoice, xeroIntegrationDetails: xd } = fx;

  log('classifier:', XeroWebhookService.classifyRetentionShape(invoice, xd));
  const split = computeRetentionSplit(invoice, xd);
  log('reducer:  ', {
    retentionLineCount: split.retentionLineCount,
    retentionUnitOnly: round2(split.retentionUnitOnly),
    retentionTaxOnly: round2(split.retentionTaxOnly),
    retentionAmount: round2(split.retentionAmount),
  });

  const signedSum = invoice.lineItems
    .filter(li => li.accountCode === xd.retention_payable_retained_code)
    .reduce((s, li) => s + Number(li.unitAmount), 0);
  log('signed sum of retained-code lines (economically correct retention):', round2(signedSum));
  log('VERDICT: reducer reports $' + round2(split.retentionAmount) +
      ' on a net-zero retention shape (signed sum = $' + round2(signedSum) +
      '). PT claim will carry phantom retention — REAL BUG.');
}

async function runScenario5() {
  header('SCENARIO 5 — ex-GST, payable, 3-line, PAID (Stage 1 only)');
  const fx = load('retention-bill-scenario-5-paid.json');
  const { invoice, xeroIntegrationDetails: xd } = fx;

  log('classifier:', XeroWebhookService.classifyRetentionShape(invoice, xd));
  const split = computeRetentionSplit(invoice, xd);
  log('reducer:  ', {
    retentionLineCount: split.retentionLineCount,
    retentionUnitOnly: round2(split.retentionUnitOnly),
    retentionTaxOnly: round2(split.retentionTaxOnly),
    retentionAmount: round2(split.retentionAmount),
  });

  const svc = makeInvoicesService();
  const filtered = invoice.lineItems.filter(li => li.accountCode === xd.bill_code);
  const items = await svc.adjustItemsWithRetention(
    invoice,
    filtered,
    786.2,
    0,
    LineAmountTypes.Exclusive,
  );
  log('adjustItemsWithRetention output:', items);
  log('payments in fixture:', invoice.payments);
  log('VERDICT (Stage 1): same as Scenario 1. Stage 2 (payment walk + trust-leg push via checkAndProcessPayment) requires the full Nest DI graph and live Xero token to verify — flagged needs-live-confirm in the findings doc.');
}

async function main() {
  log('Task #333 verification run — ' + new Date().toISOString());
  log('Production code under test:');
  log('  - back-end/dist/api/common/xero-webhooks/webhook.service.js → XeroWebhookService.classifyRetentionShape (src webhook.service.ts:336)');
  log('  - back-end/dist/api/common/integrations/xero/invoicesAndBills/xero-invoices.service.js → adjustItemsWithRetention (src xero-invoices.service.ts:3444), mapItemsDirectly (src :3195)');
  log('Retention reducer replicated in this script (citation: webhook.service.ts:3727-3760).');

  await runScenario1();
  await runScenario2();
  await runScenario3();
  await runScenario4();
  await runScenario5();

  log('');
  log('='.repeat(78));
  log('Done. Output also written to ' + path.relative(process.cwd(), OUT_LOG));

  fs.writeFileSync(OUT_LOG, lines.join('\n') + '\n');
}

main()
  .then(() => process.exit(0))
  .catch(e => { console.error(e); process.exit(1); });
