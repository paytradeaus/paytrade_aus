import { Module, OnApplicationBootstrap } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AiBillingSettings } from 'src/entities/ai-billing-settings.entity';
import { AiCreditBalance } from 'src/entities/ai-credit-balance.entity';
import { AiCreditLedger } from 'src/entities/ai-credit-ledger.entity';
import { AiCreditPurchase } from 'src/entities/ai-credit-purchase.entity';
import { CommonSettings } from 'src/entities/common-settings.entity';
import { CompanyDetails } from 'src/entities/company-details.entity';
import { EmailTemplates } from 'src/entities/email-templates.entity';
import { SubscriptionDetails } from 'src/entities/subscription-details.entity';
import { SubscriptionPlanDetails } from 'src/entities/subscription-plan-details.entity';
import { UserDetails } from 'src/entities/user-details.entity';

import { BullModule } from '@nestjs/bullmq';
import { JwtInternalService } from 'src/libs/@jwt-internal-services/jwt.internal.service';
import { EmailQueueProducer } from 'src/libs/@email-services/email-queue/email-queue.producer';
import { ObjectStorageModule } from 'src/libs/@object-storage/object-storage.module';

import { AiBillingService } from './ai-billing.service';
import { AiBillingResolver } from './ai-billing.resolver';
import { AiBillingCron } from './ai-billing.cron';
import { AiBillingReceiptService } from './ai-billing-receipt.service';
import { AiBillingConsumer } from './ai-billing-consumer.helper';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([
      AiBillingSettings,
      AiCreditBalance,
      AiCreditLedger,
      AiCreditPurchase,
      CommonSettings,
      CompanyDetails,
      EmailTemplates,
      SubscriptionDetails,
      SubscriptionPlanDetails,
      UserDetails,
    ]),
    BullModule.registerQueue({ name: 'mailQueue' }),
    ObjectStorageModule,
  ],
  providers: [
    JwtInternalService,
    EmailQueueProducer,
    AiBillingService,
    AiBillingResolver,
    AiBillingCron,
    AiBillingReceiptService,
    AiBillingConsumer,
  ],
  exports: [AiBillingService, AiBillingConsumer],
})
export class AiBillingModule implements OnApplicationBootstrap {
  constructor(
    private readonly service: AiBillingService,
    private readonly receipts: AiBillingReceiptService,
  ) {}

  onApplicationBootstrap() {
    // Wire receipt generation without forcing a circular dep on the email
    // service from inside `AiBillingService`.
    this.service.registerReceiptHandler((p) =>
      this.receipts.handlePurchaseSucceeded(p),
    );
  }
}
