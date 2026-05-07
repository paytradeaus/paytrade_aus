import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';

@Injectable()
export class XeroRetentionModeSchemaSeederService
  implements OnApplicationBootstrap
{
  private logger = new PaytradeLogger('XERO_RETENTION_MODE_SCHEMA');

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async onApplicationBootstrap() {
    try {
      await this.dataSource.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_type
            WHERE typname = 'xero_integration_details_retention_recording_mode_enum'
          ) THEN
            CREATE TYPE xero_integration_details_retention_recording_mode_enum
              AS ENUM ('ex_gst', 'inc_gst');
          END IF;
        END$$;
      `);
      await this.dataSource.query(`
        ALTER TABLE xero_integration_details
          ADD COLUMN IF NOT EXISTS retention_recording_mode
            xero_integration_details_retention_recording_mode_enum
            DEFAULT 'ex_gst',
          ADD COLUMN IF NOT EXISTS retention_tax_type text;
      `);
      const backfill = await this.dataSource.query(`
        UPDATE xero_integration_details
          SET retention_recording_mode = 'ex_gst'
          WHERE retention_recording_mode IS NULL;
      `);
      const backfilled = Array.isArray(backfill) && backfill[1] ? backfill[1] : 0;
      this.logger.log(
        `xero_integration_details retention columns ensured (back-filled ${backfilled} row(s) to ex_gst)`,
      );
    } catch (error) {
      this.logger.error(
        `xero_integration_details retention column migration failed: ${error.message}`,
      );
    }
  }
}
