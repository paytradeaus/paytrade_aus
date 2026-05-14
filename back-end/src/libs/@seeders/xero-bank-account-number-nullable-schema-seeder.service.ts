import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { XeroBankAccountNumberNullable1715731200000 } from 'src/migrations/1715731200000-XeroBankAccountNumberNullable';

/**
 * Task #116 — Runs the XeroBankAccountNumberNullable1715731200000
 * TypeORM migration at application bootstrap.
 *
 * The canonical schema change lives in
 * `back-end/src/migrations/1715731200000-XeroBankAccountNumberNullable.ts`
 * (proper TypeORM `MigrationInterface` with up/down). This service
 * exists because the project doesn't currently wire `typeorm
 * migration:run` into the deploy pipeline; without it, production
 * (synchronize=false) would never pick the migration up. Delegating
 * to the migration class here means the DDL contract has a single
 * source of truth and can't drift between the migration file and
 * an inline ALTER TABLE.
 *
 * Idempotent: `ALTER COLUMN ... DROP NOT NULL` is safe to re-run.
 */
@Injectable()
export class XeroBankAccountNumberNullableSchemaSeederService
  implements OnApplicationBootstrap
{
  private logger = new PaytradeLogger(
    'XERO_BANK_ACCOUNT_NUMBER_NULLABLE_SCHEMA',
  );

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async onApplicationBootstrap() {
    const queryRunner = this.dataSource.createQueryRunner();
    try {
      await queryRunner.connect();
      const migration = new XeroBankAccountNumberNullable1715731200000();
      await migration.up(queryRunner);
      this.logger.log(
        'xero_bank_account_details.account_number is now NULLABLE (Task #116 migration applied)',
      );
    } catch (error: any) {
      this.logger.error(
        `Task #116 migration failed: ${error?.message || error}`,
      );
    } finally {
      try {
        await queryRunner.release();
      } catch {
        // best-effort
      }
    }
  }
}
