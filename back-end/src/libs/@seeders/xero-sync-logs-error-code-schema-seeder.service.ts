import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';

/**
 * Task #75 — Production hotfix.
 *
 * Adds xero_sync_logs.error_code (varchar, nullable). Task #70 added the
 * column to the TypeORM entity but shipped no schema seeder, so production
 * INSERTs into xero_sync_logs throw `column "error_code" does not exist`,
 * blocking every Xero webhook persistence and scheduler write.
 *
 * Idempotent — safe to re-run on dev/staging/production.
 */
@Injectable()
export class XeroSyncLogsErrorCodeSchemaSeederService
  implements OnApplicationBootstrap
{
  private logger = new PaytradeLogger('XERO_SYNC_LOGS_ERROR_CODE_SCHEMA');

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async onApplicationBootstrap() {
    try {
      await this.dataSource.query(`
        ALTER TABLE xero_sync_logs
          ADD COLUMN IF NOT EXISTS error_code varchar NULL;
      `);
      this.logger.log('xero_sync_logs.error_code ensured');
    } catch (error: any) {
      this.logger.error(
        `xero_sync_logs.error_code migration failed: ${error?.message || error}`,
      );
    }
  }
}
