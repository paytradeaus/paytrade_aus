import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';

/**
 * Task #356 — Ensure the `smart_contact_auto_create` column on
 * `xero_integration_details` exists in production.
 *
 * When ON, an inbound bill (ACCPAY) that references an unmapped Xero
 * contact will auto-import and map that contact on the fly (BEFORE the
 * smart-contract step) instead of hard-failing at the contact-mapping
 * check. This is distinct from `xero_to_pt_contact_auto_create` (the
 * firehose that imports every new Xero contact).
 *
 * `synchronize=false` in production means the entity decorator alone
 * won't add the column — without this seeder the new gate would read
 * `undefined` (treated as OFF) and, more importantly, `updateSettings`
 * would throw `column "smart_contact_auto_create" does not exist`.
 *
 * Idempotent: `ADD COLUMN IF NOT EXISTS` is safe to re-run.
 */
@Injectable()
export class XeroSmartContactSchemaSeederService
  implements OnApplicationBootstrap
{
  private logger = new PaytradeLogger('XERO_SMART_CONTACT_SCHEMA');

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async onApplicationBootstrap() {
    try {
      await this.dataSource.query(`
        ALTER TABLE xero_integration_details
          ADD COLUMN IF NOT EXISTS smart_contact_auto_create boolean DEFAULT false;
      `);
      this.logger.log(
        'xero_integration_details.smart_contact_auto_create ensured (Task #356)',
      );
    } catch (error: any) {
      this.logger.error(
        `Task #356 schema seeder failed: ${error?.message || error}`,
      );
    }
  }
}
