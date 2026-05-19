import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';

/**
 * Task #233 — ensure the `temp_save_transactions` columns introduced by
 * the CSV-upload balance-suggestion fix exist in production.
 *
 * New entity columns:
 *   - `csv_closing_balance` (numeric(55,2), nullable): authoritative
 *     closing balance parsed from the uploaded CSV's preamble
 *     (e.g. NAB's `Closing balance: AUD 0.00 CR`). When present,
 *     `addSelectedTransactions` uses this as the suggested current
 *     balance instead of guessing from the transaction rows.
 *   - `csv_row_index` (integer, nullable): original CSV row index used
 *     as a deterministic tie-breaker when multiple transactions share
 *     the same `txn_date`, replacing the previous indeterminate
 *     Postgres ordering that picked an arbitrary same-date row.
 *
 * `synchronize=false` in production means the entity decorator change
 * alone won't create these columns — without this seeder the new code
 * paths would crash with `column "csv_closing_balance" does not exist`.
 *
 * Idempotent: `ADD COLUMN IF NOT EXISTS` is safe to re-run.
 */
@Injectable()
export class TempCsvUploadSchemaSeederService
  implements OnApplicationBootstrap
{
  private logger = new PaytradeLogger('TEMP_CSV_UPLOAD_SCHEMA');

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async onApplicationBootstrap() {
    try {
      await this.dataSource.query(`
        ALTER TABLE temp_save_transactions
          ADD COLUMN IF NOT EXISTS csv_closing_balance numeric(55, 2) NULL;
      `);
      await this.dataSource.query(`
        ALTER TABLE temp_save_transactions
          ADD COLUMN IF NOT EXISTS csv_row_index integer NULL;
      `);
      this.logger.log(
        'temp_save_transactions.csv_closing_balance and csv_row_index columns ensured (Task #233)',
      );
    } catch (error: any) {
      this.logger.error(
        `Task #233 schema seeder failed: ${error?.message || error}`,
      );
    }
  }
}
