import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds two new values to the `compliance_rule_action_button_type_enum` used by
 * the s76 BIF Act payment-claim compliance check (Check 6, rule 26).
 *
 * Background: the FAILED row used to always render a single "View Payments"
 * button (routing to the "Payments to do" list). But a breaching claim only
 * appears in that list once a payment has actually been initiated against it.
 * Claims that are merely past their response deadline with no payment yet live
 * in the Claims list, so "View Payments" led to an empty page. The check now
 * routes context-aware:
 *   - VIEW_CLAIMS              → only claims awaiting a response
 *   - VIEW_PAYMENTS            → only payments already in progress
 *   - VIEW_CLAIMS_AND_PAYMENTS → a mix of both (frontend renders two buttons)
 *
 * Postgres synchronize is off in production, so the enum must be extended by a
 * migration. Idempotent (ADD VALUE IF NOT EXISTS) and safe to re-run.
 */
export class ComplianceRuleViewClaimsActionButton1715732800000
  implements MigrationInterface
{
  name = 'ComplianceRuleViewClaimsActionButton1715732800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "compliance_rule_action_button_type_enum" ADD VALUE IF NOT EXISTS 'VIEW_CLAIMS';`,
    );
    await queryRunner.query(
      `ALTER TYPE "compliance_rule_action_button_type_enum" ADD VALUE IF NOT EXISTS 'VIEW_CLAIMS_AND_PAYMENTS';`,
    );
  }

  public async down(): Promise<void> {
    // Postgres does not support removing values from an enum type, so this is a
    // no-op. The unused values are harmless if left in place.
  }
}
