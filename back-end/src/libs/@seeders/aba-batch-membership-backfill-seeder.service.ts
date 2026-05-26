import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { ObjectStorageService } from 'src/libs/@object-storage/object-storage.service';

/**
 * Task #293 follow-up — one-off recovery for ABA batch ↔ sub-payment
 * membership on rows generated BEFORE Task #286 introduced the
 * `aba_batch_sub_payments` join table.
 *
 * Reconstructs membership by parsing the original .aba file (stored on
 * R2 via `file_attachments.file_path`, referenced by
 * `generate_aba_file_history.aba_file_id`) and matching each Type-1
 * detail line back to a `sub_payments` row by:
 *
 *   - source bank account     (payment_details.payment_from_account == batch.bank_account_id)
 *   - company                 (payment_details.company_id           == batch.company_id)
 *   - destination BSB+account (bank_accounts on payment_details.payment_to_account)
 *   - line amount in cents    (ABS(sub_payments.amount) * 100)
 *   - sub_payment existed at  (sub_payments.created_on <= batch.created_on)
 *
 * Only links when a detail line resolves to exactly ONE sub_payment.
 * Ambiguous (>1) and missing (0) matches are logged and skipped — this
 * is the explicit policy agreed with the user: demo seed data on
 * company 1005 has fundamentally unrecoverable lines (retention legs
 * have no corresponding sub_payment row; recurring same-amount
 * payments collide), so company 1005 is filtered out entirely.
 *
 * Idempotent + crash-safe:
 *   - Skips batches that already have any aba_batch_sub_payments rows
 *   - Each batch is processed inside its own transaction so a mid-batch
 *     failure rolls back all of that batch's INSERTs — the NOT EXISTS
 *     guard then re-picks it on the next boot. (Without the transaction,
 *     a partial run would be permanently skipped.)
 *   - INSERT uses ON CONFLICT DO NOTHING against the composite PK
 *   - R2 downloads have a hard timeout so a stuck fetch can't block boot
 *   - No-ops cleanly if the join table or file_attachments don't yet exist
 */
const DOWNLOAD_TIMEOUT_MS = 15_000;
@Injectable()
export class AbaBatchMembershipBackfillSeederService
  implements OnApplicationBootstrap
{
  private readonly logger = new PaytradeLogger('ABA_BATCH_BACKFILL');

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly objectStorage: ObjectStorageService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      if (!(await this.prerequisitesPresent())) {
        this.logger.log(
          'aba_batch_sub_payments / file_attachments not present yet — backfill skipped',
        );
        return;
      }

      const batches = await this.findBatchesNeedingBackfill();
      if (batches.length === 0) {
        this.logger.log('No legacy ABA batches need backfill — nothing to do');
        return;
      }

      this.logger.log(
        `Processing ${batches.length} legacy ABA batch(es) without join-table membership`,
      );

      let totalLines = 0;
      let totalLinked = 0;
      let totalAmbiguous = 0;
      let totalMissing = 0;
      let totalFetchFailed = 0;

      for (const batch of batches) {
        const result = await this.backfillBatch(batch);
        if (result.fetchFailed) {
          totalFetchFailed++;
          continue;
        }
        totalLines += result.lines;
        totalLinked += result.linked;
        totalAmbiguous += result.ambiguous;
        totalMissing += result.missing;
      }

      this.logger.log(
        `Backfill complete: batches=${batches.length} lines=${totalLines} ` +
          `linked=${totalLinked} ambiguous=${totalAmbiguous} ` +
          `missing=${totalMissing} fetch_failed=${totalFetchFailed}`,
      );
    } catch (error: any) {
      this.logger.error(
        `ABA batch membership backfill failed: ${error?.message || error}`,
      );
    }
  }

  private async prerequisitesPresent(): Promise<boolean> {
    const rows = await this.dataSource.query(
      `SELECT
         to_regclass('public.aba_batch_sub_payments') AS join_tbl,
         to_regclass('public.file_attachments')       AS file_tbl,
         to_regclass('public.generate_aba_file_history') AS history_tbl`,
    );
    const r = rows?.[0] || {};
    return Boolean(r.join_tbl && r.file_tbl && r.history_tbl);
  }

  /**
   * Legacy = history rows with a real .aba file but no rows in the
   * join table yet. Excludes company 1005 demo seed data per policy.
   */
  private async findBatchesNeedingBackfill(): Promise<
    Array<{
      id: string;
      company_id: number;
      bank_account_id: number;
      created_on: Date;
      file_path: string;
    }>
  > {
    return this.dataSource.query(`
      SELECT h.id, h.company_id, h.bank_account_id, h.created_on,
             fa.file_path
      FROM generate_aba_file_history h
      JOIN file_attachments fa ON fa.id = h.aba_file_id
      WHERE h.company_id <> 1005
        AND NOT EXISTS (
          SELECT 1 FROM aba_batch_sub_payments abp
          WHERE abp.aba_history_id = h.id
        )
      ORDER BY h.created_on
    `);
  }

  private async backfillBatch(batch: {
    id: string;
    company_id: number;
    bank_account_id: number;
    created_on: Date;
    file_path: string;
  }): Promise<{
    lines: number;
    linked: number;
    ambiguous: number;
    missing: number;
    fetchFailed: boolean;
  }> {
    let content: string | null = null;
    try {
      content = await this.downloadWithTimeout(batch.file_path);
    } catch (error: any) {
      this.logger.warn(
        `batch=${batch.id} download error: ${error?.message || error}`,
      );
      return { lines: 0, linked: 0, ambiguous: 0, missing: 0, fetchFailed: true };
    }
    if (!content) {
      this.logger.warn(
        `batch=${batch.id} file_path=${batch.file_path} returned no content`,
      );
      return { lines: 0, linked: 0, ambiguous: 0, missing: 0, fetchFailed: true };
    }

    const detail = this.parseAbaDetailLines(content);
    let linked = 0;
    let ambiguous = 0;
    let missing = 0;

    // Per-batch transaction: any failure rolls back this batch's inserts
    // so the NOT EXISTS guard picks it up again on next boot. Without
    // this, a partial-link on crash would skip the batch forever.
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      for (const line of detail) {
        const candidates = await qr.manager.query(
          `
          SELECT sp.sub_payment_id
          FROM sub_payments sp
          JOIN payment_details pd ON pd.payment_id = sp.payment_id
          JOIN bank_accounts dest ON dest.bank_account_id = pd.payment_to_account
          WHERE pd.company_id = $1
            AND pd.payment_from_account = $2
            AND replace(dest.bsb_number, '-', '') = $3
            AND regexp_replace(
                  regexp_replace(dest.account_number, '\\s+', '', 'g'),
                  '^0+', ''
                ) = $4
            AND (ABS(sp.amount) * 100)::bigint = $5
            AND sp.created_on <= $6
          `,
          [
            batch.company_id,
            batch.bank_account_id,
            line.recipientBsb,
            line.recipientAccount,
            line.amountCents,
            batch.created_on,
          ],
        );

        if (candidates.length === 1) {
          await qr.manager.query(
            `INSERT INTO aba_batch_sub_payments (aba_history_id, sub_payment_id)
               VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [batch.id, candidates[0].sub_payment_id],
          );
          linked++;
        } else if (candidates.length === 0) {
          missing++;
          this.logger.warn(
            `batch=${batch.id} line=${line.lineNo} ` +
              `${line.recipientBsb}/${line.recipientAccount} ` +
              `cents=${line.amountCents} -> NO_MATCH (skipped)`,
          );
        } else {
          ambiguous++;
          this.logger.warn(
            `batch=${batch.id} line=${line.lineNo} ` +
              `${line.recipientBsb}/${line.recipientAccount} ` +
              `cents=${line.amountCents} -> AMBIGUOUS(${candidates.length}) (skipped)`,
          );
        }
      }
      await qr.commitTransaction();
    } catch (error: any) {
      await qr.rollbackTransaction();
      this.logger.error(
        `batch=${batch.id} transaction rolled back: ${error?.message || error}`,
      );
      return { lines: 0, linked: 0, ambiguous: 0, missing: 0, fetchFailed: true };
    } finally {
      await qr.release();
    }

    this.logger.log(
      `batch=${batch.id} co=${batch.company_id} lines=${detail.length} ` +
        `linked=${linked} ambiguous=${ambiguous} missing=${missing}`,
    );

    return {
      lines: detail.length,
      linked,
      ambiguous,
      missing,
      fetchFailed: false,
    };
  }

  /**
   * Wraps the object-storage call in a hard timeout so a stuck R2/Replit
   * fetch can't block NestJS bootstrap. The underlying SDK call may
   * outlive the timeout — that's acceptable for a one-shot seeder; the
   * batch is recorded as fetch_failed and re-attempted on next boot.
   */
  private async downloadWithTimeout(path: string): Promise<string | null> {
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`download timed out after ${DOWNLOAD_TIMEOUT_MS}ms`)),
        DOWNLOAD_TIMEOUT_MS,
      );
    });
    try {
      return await Promise.race([
        this.objectStorage.downloadAsText(path),
        timeout,
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  /**
   * NAB CEMTEX Type-1 detail line layout (positions 1-indexed in spec,
   * 0-indexed substring offsets in code):
   *   pos 1     '1'           record type
   *   pos 2-8   BSB           e.g. "064-000"
   *   pos 9-17  account       9 chars, may be left-padded with '0' or right-padded with ' '
   *   pos 18    withholding   ' '
   *   pos 19-20 txn code      '50' = credit
   *   pos 21-30 amount cents  10 chars zero-padded
   *   pos 31-62 account title 32 chars
   *   pos 63-80 lodgement ref 18 chars
   *   pos 81-87 trace BSB
   *   pos 88-96 trace account
   */
  private parseAbaDetailLines(content: string): Array<{
    lineNo: number;
    recipientBsb: string;
    recipientAccount: string;
    amountCents: number;
  }> {
    const out: Array<{
      lineNo: number;
      recipientBsb: string;
      recipientAccount: string;
      amountCents: number;
    }> = [];
    const rawLines = content.split(/\r?\n/);
    let detailIdx = 0;
    for (const raw of rawLines) {
      if (raw.length < 96 || !raw.startsWith('1')) continue;
      // Only credit Type-1 records (txn code '50') — guards against any
      // future debit/reversal line type slipping into the matcher.
      const txnCode = raw.substring(18, 20);
      if (txnCode !== '50') continue;
      detailIdx++;
      const bsb = raw.substring(1, 8).replace('-', '');
      // Strip whitespace then leading zeros to normalize "16241178 " vs "016241178"
      const acctRaw = raw.substring(8, 17).replace(/\s+/g, '');
      const account = acctRaw.replace(/^0+/, '');
      const amountCents = parseInt(raw.substring(20, 30), 10);
      if (!Number.isFinite(amountCents)) continue;
      out.push({
        lineNo: detailIdx,
        recipientBsb: bsb,
        recipientAccount: account,
        amountCents,
      });
    }
    return out;
  }
}
