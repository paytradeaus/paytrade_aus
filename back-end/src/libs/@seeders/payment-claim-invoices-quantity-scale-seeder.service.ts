import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';

/**
 * payment_claim_invoices.quantity historically shipped as numeric(13, 0)
 * which silently truncates fractional units (e.g. 0.2 → 0) on INSERT.
 * The Xero importer for company_id=1012 / claim 100044 hit this and
 * persisted a header total of $10,200 against a line whose qty was
 * truncated to 0. Widen scale to 4 so partial units (lots, hours,
 * percentages-as-units) are preserved end-to-end.
 *
 * Idempotent — guarded by current scale so re-runs are no-ops.
 */
@Injectable()
export class PaymentClaimInvoicesQuantityScaleSeederService
  implements OnApplicationBootstrap
{
  private logger = new PaytradeLogger('PAYMENT_CLAIM_QTY_SCALE');

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async onApplicationBootstrap() {
    try {
      const cur = await this.dataSource.query(`
        SELECT numeric_precision, numeric_scale
          FROM information_schema.columns
         WHERE table_name = 'payment_claim_invoices'
           AND column_name = 'quantity'
      `);
      if (!cur?.length) {
        this.logger.log(
          'payment_claim_invoices.quantity not found — skipping (table may not exist yet)',
        );
        return;
      }
      const scale = Number(cur[0].numeric_scale);
      if (scale >= 4) {
        this.logger.log(
          `payment_claim_invoices.quantity already numeric(${cur[0].numeric_precision}, ${scale}) — no change`,
        );
        return;
      }
      await this.dataSource.query(`
        ALTER TABLE payment_claim_invoices
          ALTER COLUMN quantity TYPE numeric(20, 4)
          USING quantity::numeric(20, 4);
      `);
      this.logger.log(
        `payment_claim_invoices.quantity widened from numeric(*, ${scale}) → numeric(20, 4)`,
      );
    } catch (error: any) {
      this.logger.error(
        `payment_claim_invoices.quantity scale migration failed: ${error?.message || error}`,
      );
    }
  }
}
