import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';

/**
 * Task #274 — One-shot sweep that re-evaluates existing contact-mirror
 * sync log failures (templates 264 / 265 / 366 / 368 / 384 / 611 / 612)
 * across every Xero integration and downgrades them in-place to:
 *   - template 623 (WH_CONTACT_ARCHIVED_SKIPPED) when the linked
 *     xero_contact_details row is ARCHIVED, OR
 *   - template 624 (WH_CONTACT_DORMANT_INFO) when the linked PT
 *     contact has had no payment_claims / payment_details /
 *     journal_entries rows in the last 12 months.
 *
 * Also flips `client_suppliers_details.is_archived = true` for PT
 * contacts whose Xero mirror is ARCHIVED — same intent as the nightly
 * mirror cron, but applied immediately on first boot so the picker
 * filters take effect without waiting for the next 03:30 UTC run.
 *
 * Runs once per boot. Idempotent: rows already on 623/624 are skipped
 * (the WHERE clause restricts to the failed template family), and the
 * sweep is bounded to active rows (archived_at IS NULL) so it never
 * touches user-archived history.
 *
 * NB: this is a *companion* to the runtime interceptor in
 * `XeroService.maybeDowngradeContactMirrorLog`. The interceptor
 * prevents *new* noise; this seeder cleans up the backlog that
 * accumulated before the interceptor existed.
 */
@Injectable()
export class ContactLogNoiseSweepSeederService
  implements OnApplicationBootstrap
{
  private logger = new PaytradeLogger('CONTACT_LOG_NOISE_SWEEP');

  // 7 contact-mirror failure templates we re-classify.
  private static readonly SOURCE_TEMPLATE_IDS = [
    264, 265, 366, 368, 384, 611, 612,
  ];

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async onApplicationBootstrap() {
    try {
      // Wait for the schema seeder (`is_archived`) to land first.
      // OnApplicationBootstrap hooks fire in module registration order,
      // and the schema seeder module is registered earlier — but be
      // defensive and tolerate the column not yet existing.
      const archived = await this.sweepArchivedInXero();
      const dormant = await this.sweepDormant();
      const mirrored = await this.mirrorXeroArchivedToPaytrade();
      this.logger.log(
        `Task #274 sweep done — archived-in-xero reclassified: ${archived}, dormant reclassified: ${dormant}, pt contacts is_archived flipped: ${mirrored}`,
      );
    } catch (err: any) {
      this.logger.error(
        `Task #274 sweep failed: ${err?.message || err}`,
      );
    }
  }

  /**
   * Reclassify failed contact-mirror logs to template 623 when the
   * linked xero_contact_details.contact_status = 'ARCHIVED'.
   */
  private async sweepArchivedInXero(): Promise<number> {
    const sql = `
      WITH candidates AS (
        SELECT  xsl.id,
                xsl.log_template_id,
                xsl.error_code,
                COALESCE(xcd_by_pk.contact_name, xcd_by_guid.contact_name) AS contact_name
        FROM    xero_sync_logs xsl
        LEFT JOIN xero_contact_details xcd_by_pk
          ON  xcd_by_pk.id::text = xsl.reference_id
        LEFT JOIN xero_contact_details xcd_by_guid
          ON  xcd_by_guid.integration_id = xsl.integration_id
          AND xcd_by_guid.contact_id::text = (xsl.api_payload->>'contact_id')
        WHERE   xsl.log_template_id = ANY($1::int[])
          AND   xsl.archived_at IS NULL
          AND   (
            xcd_by_pk.contact_status = 'ARCHIVED'
            OR xcd_by_guid.contact_status = 'ARCHIVED'
          )
      )
      UPDATE  xero_sync_logs xsl
      SET     log_template_id = 623,
              error_code      = 'WH_CONTACT_ARCHIVED_SKIPPED',
              error_message   = 'Contact "' || COALESCE(c.contact_name, 'this contact')
                                || '" is archived in Xero — import skipped. Un-archive the contact in Xero, then click Retry import to bring it into Pay Trade.',
              dynamic_values  = (COALESCE(xsl.dynamic_values::jsonb, '{}'::jsonb)
                                || jsonb_build_object(
                                  'contact_name',             COALESCE(c.contact_name, ''),
                                  'original_log_template_id', c.log_template_id,
                                  'original_error_code',      c.error_code,
                                  'downgrade_reason',         'archived_in_xero_sweep'
                                ))::json,
              important_checks = (COALESCE(xsl.important_checks::jsonb, '{}'::jsonb)
                                || jsonb_build_object(
                                  'Downgraded by contact-mirror noise sweep', 'Archived in Xero',
                                  'Original template', c.log_template_id::text
                                ))::json,
              updated_on = now()
      FROM    candidates c
      WHERE   xsl.id = c.id
      RETURNING xsl.sync_id
    `;
    try {
      const result = await this.dataSource.query(sql, [
        ContactLogNoiseSweepSeederService.SOURCE_TEMPLATE_IDS,
      ]);
      return Array.isArray(result) ? result.length : 0;
    } catch (err: any) {
      this.logger.warn(
        `sweepArchivedInXero failed (non-fatal): ${err?.message || err}`,
      );
      return 0;
    }
  }

  /**
   * Reclassify failed contact-mirror logs to template 624 when the PT
   * contact has had no payment_claims / payment_details /
   * journal_entries activity in the last 12 months.
   *
   * Runs AFTER the archived sweep so archived contacts (which would
   * also look "dormant") are already off the table.
   */
  private async sweepDormant(): Promise<number> {
    const sql = `
      WITH candidates AS (
        SELECT  xsl.id,
                xsl.log_template_id,
                xsl.error_code,
                COALESCE(xcd_by_pk.contact_name, xcd_by_guid.contact_name) AS contact_name,
                COALESCE(xcd_by_pk.pt_contact_id, xcd_by_guid.pt_contact_id) AS pt_contact_id
        FROM    xero_sync_logs xsl
        LEFT JOIN xero_contact_details xcd_by_pk
          ON  xcd_by_pk.id::text = xsl.reference_id
        LEFT JOIN xero_contact_details xcd_by_guid
          ON  xcd_by_guid.integration_id = xsl.integration_id
          AND xcd_by_guid.contact_id::text = (xsl.api_payload->>'contact_id')
        WHERE   xsl.log_template_id = ANY($1::int[])
          AND   xsl.archived_at IS NULL
      ),
      classified AS (
        SELECT  c.*,
                CASE
                  WHEN c.pt_contact_id IS NULL THEN false
                  WHEN EXISTS (
                    SELECT 1 FROM payment_claims pc
                    WHERE pc.client_supplier_id = c.pt_contact_id
                      AND pc.created_on >= (now() - INTERVAL '12 months')
                  ) THEN false
                  WHEN EXISTS (
                    SELECT 1 FROM payment_details pd
                    WHERE pd.client_supplier_id = c.pt_contact_id
                      AND pd.created_on >= (now() - INTERVAL '12 months')
                  ) THEN false
                  WHEN EXISTS (
                    SELECT 1 FROM journal_entries je
                    WHERE je.supplier_id = c.pt_contact_id
                      AND je.created_on >= (now() - INTERVAL '12 months')
                  ) THEN false
                  ELSE true
                END AS is_dormant
        FROM    candidates c
      )
      UPDATE  xero_sync_logs xsl
      SET     log_template_id = 624,
              error_code      = 'WH_CONTACT_DORMANT_INFO',
              error_message   = 'Contact "' || COALESCE(cl.contact_name, 'this contact')
                                || '" has had no claim/bill/payment activity in the last 12 months — original mirror failure downgraded to informational. Add the missing fields in Xero and re-sync if you start using this contact again.',
              dynamic_values  = (COALESCE(xsl.dynamic_values::jsonb, '{}'::jsonb)
                                || jsonb_build_object(
                                  'contact_name',             COALESCE(cl.contact_name, ''),
                                  'original_log_template_id', cl.log_template_id,
                                  'original_error_code',      cl.error_code,
                                  'downgrade_reason',         'dormant_sweep'
                                ))::json,
              important_checks = (COALESCE(xsl.important_checks::jsonb, '{}'::jsonb)
                                || jsonb_build_object(
                                  'Downgraded by contact-mirror noise sweep', 'Dormant (no activity in last 12 months)',
                                  'Original template', cl.log_template_id::text
                                ))::json,
              updated_on = now()
      FROM    classified cl
      WHERE   xsl.id = cl.id
        AND   cl.is_dormant = true
      RETURNING xsl.sync_id
    `;
    try {
      const result = await this.dataSource.query(sql, [
        ContactLogNoiseSweepSeederService.SOURCE_TEMPLATE_IDS,
      ]);
      return Array.isArray(result) ? result.length : 0;
    } catch (err: any) {
      this.logger.warn(
        `sweepDormant failed (non-fatal): ${err?.message || err}`,
      );
      return 0;
    }
  }

  /**
   * Flip `client_suppliers_details.is_archived = true` for any PT
   * contact whose linked xero_contact_details row is ARCHIVED. Mirrors
   * the nightly cron's behaviour but applied immediately on first boot.
   */
  private async mirrorXeroArchivedToPaytrade(): Promise<number> {
    try {
      const result = await this.dataSource.query(`
        UPDATE  client_suppliers_details csd
        SET     is_archived = true,
                archived_at = COALESCE(csd.archived_at, now()),
                archived_reason = 'xero_mirror'
        FROM    xero_contact_details xcd
        WHERE   xcd.pt_contact_id = csd.client_supplier_id
          AND   xcd.contact_status = 'ARCHIVED'
          AND   csd.is_archived = false
          AND   csd.is_deleted = false
        RETURNING csd.client_supplier_id
      `);
      return Array.isArray(result) ? result.length : 0;
    } catch (err: any) {
      this.logger.warn(
        `mirrorXeroArchivedToPaytrade failed (non-fatal): ${err?.message || err}`,
      );
      return 0;
    }
  }
}
