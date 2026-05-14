import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Task #135 — Phase 1: dedupe duplicate `xero_contact_details` rows and
 * record any mapped-vs-mapped conflicts that need manual resolution.
 *
 * The legacy `syncAllContactsByCompanyId` flow used a check-then-insert
 * pattern with no DB-level uniqueness guard and no in-flight lock.
 * Concurrent runs (rapid double-click on SYNC, or a manual sync that
 * overlapped with the 15-min fallback / a webhook) both saw a
 * `(integration_id, contact_id)` row as missing and both inserted —
 * producing exact duplicates that polluted the XERO CONTACTS tab and
 * the auto-map flow downstream.
 *
 * IMPORTANT — split into two migrations:
 *   - **Phase 1 (this file)**: dedupe + record conflicts. Always
 *     commits. Never raises on remaining conflicts. The conflict
 *     ledger (`xero_contact_dedupe_conflicts`) is durable so an admin
 *     can inspect/resolve it after this migration succeeds.
 *   - **Phase 2** (`1715731400000-XeroContactDetailsUniqueIndex.ts`):
 *     gates on remaining duplicates and creates the partial unique
 *     index. If conflicts are still outstanding, Phase 2 raises a
 *     clear actionable error — but Phase 1's dedupe work and the
 *     conflict ledger are already committed, so the operator can
 *     resolve and re-run Phase 2 alone without losing progress.
 *
 * Phase 1 steps:
 *   1. Ensure the conflict-tracking table exists with its own unique
 *      constraint so re-runs don't append duplicate conflict rows.
 *   2. Emit a dry-run NOTICE report grouped by company so the scope is
 *      visible in the migration log before any deletes happen.
 *   3. Record mapped-vs-mapped conflict groups into
 *      `xero_contact_dedupe_conflicts` (idempotent upsert) and skip
 *      them — they need a human to decide which PT contact to keep.
 *   4. For non-conflicting groups: pick a canonical row (prefer
 *      MAPPED, then oldest `created_on`, then lowest `id`), repoint
 *      every FK / lookup that pointed at a duplicate row's `id`
 *      (`xero_invoices_bills.contact_id`, `xero_payments.contact_id`,
 *      and the `xeroId` reference inside `xero_sync_logs.reference`
 *      JSONB payloads), then delete the duplicates.
 *
 * Idempotent: on a clean DB the cleanup is a no-op, the conflict log
 * is upserted on its unique key.
 */
export class XeroContactsDedupeAndUniqueIndex1715731300000
  implements MigrationInterface
{
  name = 'XeroContactsDedupeAndUniqueIndex1715731300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Conflict-tracking table for the manual-resolution backlog.
    //    The unique constraint on (integration_id, contact_id) is what
    //    makes the conflict-recording step idempotent across re-runs.
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "xero_contact_dedupe_conflicts" (
        "id" SERIAL PRIMARY KEY,
        "integration_id" integer NOT NULL,
        "contact_id" uuid NOT NULL,
        "company_id" integer,
        "mapped_row_ids" uuid[] NOT NULL,
        "mapped_pt_contact_ids" integer[] NOT NULL,
        "detected_at" timestamp with time zone NOT NULL DEFAULT timezone('utc', now()),
        "resolved_at" timestamp with time zone,
        "notes" text
      );
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_xero_contact_dedupe_conflicts_pair"
        ON "xero_contact_dedupe_conflicts" ("integration_id", "contact_id");
    `);

    // 2. Dry-run report (logged via RAISE NOTICE).
    await queryRunner.query(`
      DO $$
      DECLARE
        rec RECORD;
        total_dupe_groups int := 0;
        total_dupe_rows int := 0;
      BEGIN
        FOR rec IN
          SELECT
            xcd.integration_id,
            xcd.contact_id,
            xid.company_id,
            COUNT(*) AS row_count,
            array_agg(xcd.id ORDER BY xcd.created_on, xcd.id) AS row_ids
          FROM xero_contact_details xcd
          LEFT JOIN xero_integration_details xid
            ON xid.integration_id = xcd.integration_id AND xid.status = 'ACTIVE'
          WHERE xcd.contact_id IS NOT NULL
          GROUP BY xcd.integration_id, xcd.contact_id, xid.company_id
          HAVING COUNT(*) > 1
        LOOP
          total_dupe_groups := total_dupe_groups + 1;
          total_dupe_rows := total_dupe_rows + (rec.row_count - 1);
          RAISE NOTICE '[Task #135 dedupe] company_id=% integration_id=% contact_id=% row_count=% row_ids=%',
            rec.company_id, rec.integration_id, rec.contact_id, rec.row_count, rec.row_ids;
        END LOOP;
        RAISE NOTICE '[Task #135 dedupe] dry-run summary: % duplicate groups, % rows would be removed (excluding conflict groups)',
          total_dupe_groups, total_dupe_rows;
      END $$;
    `);

    // 3. Identify and record TRUE conflict groups: duplicate
    //    `(integration_id, contact_id)` rows whose mapped copies point
    //    at *different* PayTrade contacts. Groups where every mapped
    //    row references the same `pt_contact_id` (or only one row is
    //    mapped) are safe to auto-merge in step 4 — they are NOT
    //    recorded as conflicts. `COUNT(DISTINCT pt_contact_id)`
    //    naturally ignores NULLs, so unmapped rows don't inflate the
    //    distinct count. Idempotent thanks to the unique index above.
    await queryRunner.query(`
      INSERT INTO xero_contact_dedupe_conflicts
        (integration_id, contact_id, company_id, mapped_row_ids, mapped_pt_contact_ids)
      SELECT
        xcd.integration_id,
        xcd.contact_id,
        (SELECT xid.company_id FROM xero_integration_details xid
           WHERE xid.integration_id = xcd.integration_id AND xid.status = 'ACTIVE'
           LIMIT 1) AS company_id,
        array_agg(xcd.id) FILTER (WHERE xcd.pt_contact_id IS NOT NULL) AS mapped_row_ids,
        array_agg(xcd.pt_contact_id) FILTER (WHERE xcd.pt_contact_id IS NOT NULL) AS mapped_pt_contact_ids
      FROM xero_contact_details xcd
      WHERE xcd.contact_id IS NOT NULL
      GROUP BY xcd.integration_id, xcd.contact_id
      HAVING COUNT(*) > 1
         AND COUNT(DISTINCT xcd.pt_contact_id) > 1
      ON CONFLICT (integration_id, contact_id) DO UPDATE
        SET mapped_row_ids = EXCLUDED.mapped_row_ids,
            mapped_pt_contact_ids = EXCLUDED.mapped_pt_contact_ids,
            company_id = EXCLUDED.company_id,
            detected_at = timezone('utc', now()),
            resolved_at = NULL;
    `);

    await queryRunner.query(`
      DO $$
      DECLARE
        conflict_count int;
      BEGIN
        SELECT COUNT(*) INTO conflict_count
          FROM xero_contact_dedupe_conflicts
          WHERE resolved_at IS NULL;
        IF conflict_count > 0 THEN
          RAISE NOTICE '[Task #135 dedupe] % unresolved mapped-vs-mapped conflict group(s) recorded in xero_contact_dedupe_conflicts. Resolve them manually before the Phase 2 migration creates the unique index.', conflict_count;
        END IF;
      END $$;
    `);

    // 4. Resolve non-conflicting groups: pick canonical, repoint FKs
    //    *and* sync-log JSONB references, then delete dupes.
    await queryRunner.query(`
      DO $$
      DECLARE
        grp RECORD;
        canonical_id uuid;
        duplicate_ids uuid[];
        before_count int;
        after_count int;
        sync_log_repointed int;
      BEGIN
        SELECT COUNT(*) INTO before_count FROM xero_contact_details;
        FOR grp IN
          SELECT
            xcd.integration_id,
            xcd.contact_id,
            COUNT(*) AS row_count
          FROM xero_contact_details xcd
          WHERE xcd.contact_id IS NOT NULL
          GROUP BY xcd.integration_id, xcd.contact_id
          HAVING COUNT(*) > 1
        LOOP
          -- Skip TRUE conflict groups (mapped rows reference more than
          -- one distinct PayTrade contact). COUNT(DISTINCT) ignores
          -- NULLs so unmapped duplicates don't trigger this branch and
          -- can still be auto-merged below.
          IF (SELECT COUNT(DISTINCT pt_contact_id)
                FROM xero_contact_details
                WHERE integration_id = grp.integration_id
                  AND contact_id = grp.contact_id
                  AND pt_contact_id IS NOT NULL) > 1 THEN
            CONTINUE;
          END IF;

          -- Canonical: prefer mapped, then oldest created_on, then lowest id text.
          SELECT id INTO canonical_id
          FROM xero_contact_details
          WHERE integration_id = grp.integration_id
            AND contact_id = grp.contact_id
          ORDER BY
            CASE WHEN mapped_status IN ('Manual', 'Auto', 'System') THEN 0 ELSE 1 END,
            created_on NULLS LAST,
            id::text
          LIMIT 1;

          SELECT array_agg(id) INTO duplicate_ids
          FROM xero_contact_details
          WHERE integration_id = grp.integration_id
            AND contact_id = grp.contact_id
            AND id <> canonical_id;

          IF duplicate_ids IS NULL OR array_length(duplicate_ids, 1) = 0 THEN
            CONTINUE;
          END IF;

          -- Repoint hard FK references to the canonical row.
          UPDATE xero_invoices_bills
            SET contact_id = canonical_id
            WHERE contact_id = ANY(duplicate_ids);

          UPDATE xero_payments
            SET contact_id = canonical_id
            WHERE contact_id = ANY(duplicate_ids);

          -- Repoint the JSONB xeroId references inside the per-sync
          -- log payloads. The xero_sync_logs.reference column stores
          -- {"xeroId": "<xero_contact_details.id>", "paytradeId": ...}
          -- so dangling refs would be left behind on delete otherwise.
          UPDATE xero_sync_logs
            SET reference = jsonb_set(
                  reference::jsonb,
                  '{xeroId}',
                  to_jsonb(canonical_id::text)
                )
            WHERE reference IS NOT NULL
              AND reference::jsonb->>'xeroId' = ANY(SELECT unnest(duplicate_ids)::text);
          GET DIAGNOSTICS sync_log_repointed = ROW_COUNT;

          -- Delete the duplicate rows.
          DELETE FROM xero_contact_details
            WHERE id = ANY(duplicate_ids);

          RAISE NOTICE '[Task #135 dedupe] integration_id=% contact_id=% kept canonical=% removed=% sync_logs_repointed=%',
            grp.integration_id, grp.contact_id, canonical_id, duplicate_ids, sync_log_repointed;
        END LOOP;
        SELECT COUNT(*) INTO after_count FROM xero_contact_details;
        RAISE NOTICE '[Task #135 dedupe] xero_contact_details rows: before=% after=% delta=%',
          before_count, after_count, before_count - after_count;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // We deliberately keep `xero_contact_dedupe_conflicts` so any
    // recorded mapped-vs-mapped conflicts aren't lost on rollback.
    // No-op for the dedupe itself (deletes are non-recoverable).
  }
}
