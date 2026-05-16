import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubscriptionTransaction } from 'src/entities/subscription-transactions.entity';
import { SubscriptionDetails } from 'src/entities/subscription-details.entity';
import { BackfillCompany1012InitialPaymentSeederService } from './backfill-company-1012-initial-payment-seeder.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([SubscriptionTransaction, SubscriptionDetails]),
  ],
  providers: [BackfillCompany1012InitialPaymentSeederService],
})
export class BackfillCompany1012InitialPaymentSeederModule {}
