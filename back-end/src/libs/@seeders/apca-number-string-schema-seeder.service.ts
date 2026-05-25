import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';

/**
 * Converts `bank_accounts.apca_number` from `int` to `varchar(6)` so
 * that user-entered leading zeros (e.g. the common "000000" placeholder
 * used by several banks) are preserved end-to-end.
 *
 * Previously the column was stored as `int`, which silently truncated
 * leading zeros. From the user's perspective the APCA number "vanished"
 * after editing — no error was raised; the int simply became 0 and the
 * downstream `if (!accountDetails.apca_number)` guard treated 0 as
 * empty.
 *
 * Idempotent: the ALTER is gated on `information_schema.columns` so the
 * conversion only runs when the column is still an int. Existing
 * integer values are cast to text without padding — they were already
 * lossy (leading zeros lost on original insert) so re-padding them
 * would invent data we never had.
 */
@Injectable()
export class ApcaNumberStringSchemaSeederService
  implements OnApplicationBootstrap
{
  private logger = new PaytradeLogger('APCA_NUMBER_STRING_SCHEMA');

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async onApplicationBootstrap() {
    try {
      const rows: Array<{ data_type: string; character_maximum_length: number | null }> =
        await this.dataSource.query(
          `SELECT data_type, character_maximum_length
             FROM information_schema.columns
            WHERE table_name = 'bank_accounts'
              AND column_name = 'apca_number'`,
        );
      if (rows.length === 0) {
        this.logger.warn(
          'bank_accounts.apca_number column not found — skipping APCA string migration.',
        );
        return;
      }
      const { data_type, character_maximum_length } = rows[0];
      if (
        data_type === 'character varying' &&
        character_maximum_length === 6
      ) {
        this.logger.log(
          'bank_accounts.apca_number already varchar(6) — no change.',
        );
        return;
      }

      await this.dataSource.query(
        `ALTER TABLE bank_accounts
           ALTER COLUMN apca_number TYPE varchar(6)
           USING (CASE
                    WHEN apca_number IS NULL THEN NULL
                    ELSE apca_number::text
                  END)`,
      );
      this.logger.log(
        `bank_accounts.apca_number converted from ${data_type} to varchar(6) (preserves leading zeros on future writes).`,
      );
    } catch (error: any) {
      this.logger.error(
        `APCA number string migration failed: ${error?.message || error}`,
      );
    }
  }
}
