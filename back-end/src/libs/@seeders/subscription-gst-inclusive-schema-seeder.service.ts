import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { getStripeInstance } from 'src/libs/@stripe-helper/stripe-helper';

/**
 * Task #312 — Stripe GST receipts split.
 *
 * Two responsibilities on boot:
 *
 *   1. Ensure `subscription_details.is_gst_inclusive` column exists.
 *      Required for the billing-history GraphQL response to mark a
 *      subscription as GST-inclusive (Signature) vs GST-exclusive
 *      (everyone else).
 *
 *   2. Idempotent legacy backfill driven by env
 *      `LEGACY_INCLUSIVE_GST_SUB_IDS` — comma-separated list of Stripe
 *      subscription ids that pre-date the GST tax-rate code and whose
 *      contracted price was already GST-inclusive. For each listed sub:
 *        - Resolve (find-or-create) the AU 10% INCLUSIVE GST tax rate
 *          in the live Stripe account.
 *        - Attach it as `default_tax_rates` and to every subscription
 *          item's `tax_rates` (Stripe requires both for invoice
 *          rendering).
 *        - Mark `is_gst_inclusive = true` on the matching
 *          subscription_details row.
 *      Re-running is a no-op: skipped when the row is already flagged
 *      AND the Stripe sub already carries an inclusive rate.
 *
 * Why env-driven rather than auto-detect: misclassifying a sub as
 * inclusive would silently overcharge a customer (we'd absorb the GST
 * out of their headline). Operators must opt-in per sub id.
 */
@Injectable()
export class SubscriptionGstInclusiveSchemaSeederService
  implements OnApplicationBootstrap
{
  private readonly logger = new PaytradeLogger('SUB_GST_INCLUSIVE_BACKFILL');

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.ensureSchema();
    await this.backfillLegacyInclusiveSubs();
    await this.backfillTransactionTaxFromStripe();
  }

  private async ensureSchema(): Promise<void> {
    try {
      await this.dataSource.query(`
        ALTER TABLE subscription_details
          ADD COLUMN IF NOT EXISTS is_gst_inclusive boolean DEFAULT false;
      `);
      // Stripe-reported tax breakdown columns on subscription_transaction,
      // populated by the invoice webhook + this seeder's backfill.
      await this.dataSource.query(`
        ALTER TABLE subscription_transaction
          ADD COLUMN IF NOT EXISTS stripe_tax_amount numeric NULL,
          ADD COLUMN IF NOT EXISTS stripe_total_excluding_tax numeric NULL;
      `);
      this.logger.log(
        'subscription_details.is_gst_inclusive + subscription_transaction tax columns ensured.',
      );
    } catch (err: any) {
      this.logger.error(
        `Failed to ensure GST columns: ${err?.message || err}`,
      );
    }
  }

  /**
   * Backfill `stripe_tax_amount` / `stripe_total_excluding_tax` on
   * historical subscription_transaction rows by re-fetching the invoice
   * from Stripe. Bounded per boot to avoid hammering the API on first
   * deploy; re-runs every restart until the queue is empty. Live mode
   * only — sandbox transactions are not displayed on the receipt UI.
   */
  private async backfillTransactionTaxFromStripe(): Promise<void> {
    const BATCH = 200;
    let rows: Array<{ id: string; invoice_id: string }>;
    try {
      rows = await this.dataSource.query(
        `SELECT id, invoice_id
           FROM subscription_transaction
          WHERE stripe_tax_amount IS NULL
            AND invoice_id IS NOT NULL
            AND invoice_id <> ''
          ORDER BY paid_at DESC NULLS LAST
          LIMIT $1`,
        [BATCH],
      );
    } catch (err: any) {
      this.logger.error(
        `Tax backfill query failed: ${err?.message || err}`,
      );
      return;
    }
    if (!rows?.length) return;

    let stripe: any;
    try {
      stripe = getStripeInstance(false);
    } catch (err: any) {
      this.logger.log(
        `Tax backfill skipped — live Stripe key unavailable: ${err?.message || err}`,
      );
      return;
    }

    let updated = 0;
    let failed = 0;
    for (const row of rows) {
      try {
        const inv = await stripe.invoices.retrieve(row.invoice_id);
        const tax =
          typeof inv?.tax === 'number' ? inv.tax / 100 : null;
        const ex =
          typeof inv?.total_excluding_tax === 'number'
            ? inv.total_excluding_tax / 100
            : null;
        if (tax === null) continue;
        await this.dataSource.query(
          `UPDATE subscription_transaction
              SET stripe_tax_amount = $1,
                  stripe_total_excluding_tax = $2
            WHERE id = $3`,
          [tax, ex, row.id],
        );
        updated++;
      } catch (err: any) {
        failed++;
        this.logger.error(
          `Tax backfill failed for invoice ${row.invoice_id}: ${err?.message || err}`,
        );
      }
    }
    this.logger.log(
      `Tax backfill batch: scanned=${rows.length} updated=${updated} failed=${failed}`,
    );
  }

  private async backfillLegacyInclusiveSubs(): Promise<void> {
    const raw = (process.env.LEGACY_INCLUSIVE_GST_SUB_IDS || '').trim();
    if (!raw) return;
    const subIds = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (!subIds.length) return;

    let stripe: any;
    try {
      stripe = getStripeInstance(false); // live mode only
    } catch (err: any) {
      this.logger.error(
        `Cannot resolve live Stripe instance for inclusive-GST backfill: ${err?.message || err}`,
      );
      return;
    }

    let inclusiveRateId: string | null;
    try {
      inclusiveRateId = await this.resolveInclusiveGstRate(stripe);
    } catch (err: any) {
      this.logger.error(
        `Failed to resolve inclusive AU GST tax rate: ${err?.message || err}`,
      );
      return;
    }
    if (!inclusiveRateId) {
      this.logger.error(
        'No inclusive AU GST tax rate id resolved; legacy backfill aborted.',
      );
      return;
    }

    for (const subId of subIds) {
      try {
        await this.attachInclusiveRateToSub(stripe, subId, inclusiveRateId);
      } catch (err: any) {
        this.logger.error(
          `Inclusive-GST backfill failed for ${subId}: ${err?.message || err}`,
        );
      }
    }
  }

  private async resolveInclusiveGstRate(stripe: any): Promise<string | null> {
    const list = await stripe.taxRates.list({ active: true, limit: 100 });
    const match = (list?.data ?? []).find(
      (r: any) =>
        r.percentage === 10 &&
        r.inclusive === true &&
        (r.country === 'AU' || r.jurisdiction === 'AU'),
    );
    if (match?.id) return match.id;
    const created = await stripe.taxRates.create({
      display_name: 'GST',
      description: 'Australian Goods and Services Tax (10%, inclusive)',
      percentage: 10,
      inclusive: true,
      country: 'AU',
      jurisdiction: 'AU',
    });
    return created?.id ?? null;
  }

  private async attachInclusiveRateToSub(
    stripe: any,
    subId: string,
    rateId: string,
  ): Promise<void> {
    // Skip when DB already flagged AND Stripe sub already carries the rate.
    const dbRow = await this.dataSource.query(
      `SELECT id, is_gst_inclusive FROM subscription_details WHERE stripe_subscription_id = $1 LIMIT 1`,
      [subId],
    );
    const alreadyFlagged = dbRow?.[0]?.is_gst_inclusive === true;

    const sub = await stripe.subscriptions.retrieve(subId, {
      expand: ['items.data'],
    });
    const defaultRateIds: string[] = (sub.default_tax_rates ?? []).map(
      (r: any) => (typeof r === 'string' ? r : r.id),
    );
    const defaultHasInclusive = defaultRateIds.includes(rateId);

    // Check items independently — Stripe item-level `tax_rates` overrides
    // `default_tax_rates`, so we must ensure EVERY item carries the rate.
    // A prior run that updated the default but had an item update fail must
    // be self-healed; never short-circuit on the default alone.
    const items = (sub.items?.data ?? []) as Array<{
      id: string;
      tax_rates?: any[];
    }>;
    const itemsMissingRate = items.filter((item) => {
      const ids: string[] = (item.tax_rates ?? []).map((r: any) =>
        typeof r === 'string' ? r : r.id,
      );
      return !ids.includes(rateId);
    });

    const stripeFullyMigrated =
      defaultHasInclusive && itemsMissingRate.length === 0;

    if (alreadyFlagged && stripeFullyMigrated) {
      this.logger.log(
        `Inclusive-GST already attached to ${subId} (default + all ${items.length} item(s)) and DB flagged; skipping.`,
      );
      return;
    }

    if (!defaultHasInclusive) {
      await stripe.subscriptions.update(subId, {
        default_tax_rates: [rateId],
      });
    }
    for (const item of itemsMissingRate) {
      await stripe.subscriptionItems.update(item.id, {
        tax_rates: [rateId],
      });
    }
    if (!defaultHasInclusive || itemsMissingRate.length > 0) {
      this.logger.log(
        `Attached inclusive AU GST rate ${rateId} to subscription ${subId} (default updated=${!defaultHasInclusive}, items updated=${itemsMissingRate.length}/${items.length}).`,
      );
    }

    // Only flag the DB AFTER all Stripe writes succeed for this sub.
    // If any Stripe call above throws, the outer try/catch logs and the
    // row stays unflagged so the next boot retries cleanly.
    if (!alreadyFlagged) {
      await this.dataSource.query(
        `UPDATE subscription_details SET is_gst_inclusive = true WHERE stripe_subscription_id = $1`,
        [subId],
      );
      this.logger.log(
        `Marked subscription_details.is_gst_inclusive=true for ${subId}.`,
      );
    }
  }
}
