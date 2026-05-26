import { Module } from '@nestjs/common';
import { AbaBatchMembershipBackfillSeederService } from './aba-batch-membership-backfill-seeder.service';

@Module({
  providers: [AbaBatchMembershipBackfillSeederService],
  exports: [AbaBatchMembershipBackfillSeederService],
})
export class AbaBatchMembershipBackfillSeederModule {}
