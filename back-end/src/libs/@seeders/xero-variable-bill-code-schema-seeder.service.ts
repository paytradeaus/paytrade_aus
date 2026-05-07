import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';

/**
 * Task #41 — Variable bill code per supplier.
 *
 * Adds (idempotent, runs in dev / staging / production on bootstrap):
 *  - xero_integration_details.bill_code_is_variable (bool, default false)
 *  - xero_integration_details.bill_code_naming_convention (text, null)
 *  - xero_integration_details.bill_code_allow_fallback (bool, default true)
 *  - client_suppliers_details.xero_default_account_code (text, null)
 *  - table client_supplier_project_xero_account_codes (per-project override)
 */
@Injectable()
export class XeroVariableBillCodeSchemaSeederService
  implements OnApplicationBootstrap
{
  private logger = new PaytradeLogger('XERO_VARIABLE_BILL_CODE_SCHEMA');

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async onApplicationBootstrap() {
    try {
      await this.dataSource.query(`
        ALTER TABLE xero_integration_details
          ADD COLUMN IF NOT EXISTS bill_code_is_variable boolean DEFAULT false,
          ADD COLUMN IF NOT EXISTS bill_code_naming_convention text,
          ADD COLUMN IF NOT EXISTS bill_code_allow_fallback boolean DEFAULT true;
      `);
      await this.dataSource.query(`
        ALTER TABLE client_suppliers_details
          ADD COLUMN IF NOT EXISTS xero_default_account_code text;
      `);
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS client_supplier_project_xero_account_codes (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          company_id integer NOT NULL,
          client_supplier_id integer NOT NULL,
          project_id integer NOT NULL,
          account_code text NOT NULL,
          created_by integer,
          created_on timestamptz NOT NULL DEFAULT timezone('utc', now()),
          updated_by integer,
          updated_on timestamptz NOT NULL DEFAULT timezone('utc', now())
        );
      `);
      await this.dataSource.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS uq_csp_xero_acct_supplier_project
          ON client_supplier_project_xero_account_codes (client_supplier_id, project_id);
      `);
      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS ix_csp_xero_acct_company
          ON client_supplier_project_xero_account_codes (company_id);
      `);
      this.logger.log(
        'Variable bill code schema ensured (xero_integration_details + client_suppliers_details + client_supplier_project_xero_account_codes).',
      );
    } catch (error) {
      this.logger.error(
        `Variable bill code schema migration failed: ${error.message}`,
      );
    }
  }
}
