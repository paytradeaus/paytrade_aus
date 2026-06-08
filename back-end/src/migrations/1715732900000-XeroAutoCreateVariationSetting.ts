import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Per-company Xero sync setting:
 *   - xero_integration_details.auto_create_variation_on_over_contract
 *
 * When ON, inbound Xero bills/invoices that take the contract over its
 * current size auto-create an "Agreed" variation for the cumulative
 * shortfall and log a Success instead of the over-contract Warning.
 *
 * Mirrors the entity column default. IF NOT EXISTS keeps it safe to
 * re-run and idempotent against a manually-applied dev column.
 */
export class XeroAutoCreateVariationSetting1715732900000
  implements MigrationInterface
{
  name = 'XeroAutoCreateVariationSetting1715732900000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "xero_integration_details"
         ADD COLUMN IF NOT EXISTS "auto_create_variation_on_over_contract" boolean DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "xero_integration_details"
         DROP COLUMN IF EXISTS "auto_create_variation_on_over_contract"`,
    );
  }
}
