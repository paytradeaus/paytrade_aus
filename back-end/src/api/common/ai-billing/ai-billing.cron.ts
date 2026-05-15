import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { AiBillingService } from './ai-billing.service';

/**
 * Task #161 — Schedules:
 *
 *  - **Monthly allocation** at 00:05 UTC on the 1st of each month. The job
 *    is idempotent on `(company_id, period)` so multiple instances are safe.
 *
 *  - **Auto-top-up scanner** every 15 minutes. Companies with auto-top-up
 *    enabled and balance below trigger get charged via `chargeTopup`.
 */
@Injectable()
export class AiBillingCron implements OnApplicationBootstrap {
  private readonly logger = new PaytradeLogger('AI_BILLING_CRON');

  constructor(private readonly billing: AiBillingService) {}

  async onApplicationBootstrap() {
    // Catch-up allocation on startup so a new deploy on day 1 doesn't miss it.
    try {
      await this.billing.runMonthlyAllocation();
    } catch (err) {
      this.logger.error(`Startup catch-up allocation failed: ${err}`);
    }
  }

  @Cron('5 0 1 * *', { timeZone: 'UTC', name: 'ai-billing-monthly-alloc' })
  async monthlyAllocation() {
    try {
      await this.billing.runMonthlyAllocation();
    } catch (err) {
      this.logger.error(`Monthly allocation cron failed: ${err}`);
    }
  }

  @Cron('*/15 * * * *', { timeZone: 'UTC', name: 'ai-billing-auto-topup' })
  async autoTopupScan() {
    try {
      const candidates: Array<{ company_id: number }> = await (
        this.billing as any
      ).dataSource.query(
        `SELECT company_id FROM ai_billing_settings
          WHERE auto_topup_enabled = true
            AND stripe_payment_method_id IS NOT NULL`,
      );
      for (const c of candidates) {
        try {
          const evalResult = await this.billing.evaluateAutoTopup(c.company_id);
          if (!evalResult) continue;
          await this.billing.chargeTopup({
            companyId: c.company_id,
            creditsUsd: evalResult.amountUsd,
            trigger: 'auto_topup',
            isSandbox: false,
          });
        } catch (err) {
          this.logger.error(
            `Auto top-up failed for company ${c.company_id}: ${err}`,
          );
        }
      }
    } catch (err) {
      this.logger.error(`Auto top-up scan failed: ${err}`);
    }
  }
}
