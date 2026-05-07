import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';

/**
 * Phase 2 (Retention contact GST sync) schema bootstrap.
 *
 * Adds:
 *  - client_suppliers_details.xero_sales_gst_setting (text, null)
 *  - client_suppliers_details.xero_purchases_gst_setting (text, null)
 *  - company_details.is_gst_registered (boolean, null)
 *  - xero_integration_details.xero_org_country_code (varchar, null)
 *  - xero_integration_details.xero_org_is_gst_registered (boolean, null)
 *  - xero_integration_details.xero_org_sales_tax_basis (text, null)
 *  - xero_integration_details.xero_org_default_sales_tax (text, null)
 *  - xero_integration_details.xero_org_default_purchases_tax (text, null)
 *  - xero_integration_details.xero_org_settings_synced_at (timestamptz, null)
 */
@Injectable()
export class XeroContactGstSchemaSeederService
  implements OnApplicationBootstrap
{
  private logger = new PaytradeLogger('XERO_CONTACT_GST_SCHEMA');

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async onApplicationBootstrap() {
    try {
      await this.dataSource.query(`
        ALTER TABLE client_suppliers_details
          ADD COLUMN IF NOT EXISTS xero_sales_gst_setting text,
          ADD COLUMN IF NOT EXISTS xero_purchases_gst_setting text;
      `);
      await this.dataSource.query(`
        ALTER TABLE company_details
          ADD COLUMN IF NOT EXISTS is_gst_registered boolean;
      `);
      await this.dataSource.query(`
        ALTER TABLE xero_integration_details
          ADD COLUMN IF NOT EXISTS xero_org_country_code varchar(8),
          ADD COLUMN IF NOT EXISTS xero_org_is_gst_registered boolean,
          ADD COLUMN IF NOT EXISTS xero_org_sales_tax_basis text,
          ADD COLUMN IF NOT EXISTS xero_org_default_sales_tax text,
          ADD COLUMN IF NOT EXISTS xero_org_default_purchases_tax text,
          ADD COLUMN IF NOT EXISTS xero_org_settings_synced_at timestamptz;
      `);
      this.logger.log(
        'Contact GST sync columns ensured on client_suppliers_details / company_details / xero_integration_details',
      );
    } catch (error) {
      this.logger.error(
        `Contact GST schema migration failed: ${error.message}`,
      );
    }
  }
}
