import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';

/**
 * Task #50 — Split payment/retention Xero sync gates.
 *
 * Adds:
 *   1. xero_payments.bank_transfer_reference (text) — caches the
 *      `PT-RET-{pt_payment_id}` reference stamped on the Xero
 *      BankTransfer. Used by the inbound matcher's reference shortcut.
 *   2. Unique partial index on xero_payments.bank_transfer_id (where
 *      bank_transfer_id IS NOT NULL) — guarantees a single PT row per
 *      Xero BankTransfer so the inbound matcher's uniqueness check
 *      cannot be defeated by a race.
 *
 * Idempotent — safe to re-run on production where synchronize=false.
 */
@Injectable()
export class XeroPaymentSplitSchemaSeederService
  implements OnApplicationBootstrap
{
  private logger = new PaytradeLogger('XERO_PAYMENT_SPLIT_SCHEMA');

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async onApplicationBootstrap() {
    try {
      await this.dataSource.query(`
        ALTER TABLE xero_payments
          ADD COLUMN IF NOT EXISTS bank_transfer_reference text;
      `);
      await this.dataSource.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS uq_xero_payments_bank_transfer_id
          ON xero_payments (bank_transfer_id)
          WHERE bank_transfer_id IS NOT NULL;
      `);
      this.logger.log(
        'xero_payments.bank_transfer_reference + uq_xero_payments_bank_transfer_id ensured',
      );
    } catch (error: any) {
      this.logger.error(
        `xero_payments split-schema migration failed: ${error?.message || error}`,
      );
    }
  }
}
