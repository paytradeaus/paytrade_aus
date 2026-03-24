import { Module } from '@nestjs/common';
import { PtSubscriptionResolver } from './pt-subscription.resolver';
import { PtSubscriptionService } from './pt-subscription.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminDetails } from 'src/entities/admin-details.entity';
import { SubscriptionItems } from 'src/entities/subscription-items.entity';
import { SubscriptionPlanItems } from 'src/entities/subscription-plan-items.entity';
import { UserDetails } from 'src/entities/user-details.entity';
import { ActivityLogNew } from 'src/entities/activity-log-new.entity';
import { ActivityLogTemplates } from 'src/entities/activity-log-templates.entity';
import { ActivityLogService } from 'src/api/common/activity-log/activity-log.service';
import { CompanyDetails } from 'src/entities/company-details.entity';
import { SubscriptionPlanDetails } from 'src/entities/subscription-plan-details.entity';
import { SubscriptionPricingPlan } from 'src/entities/subscription-pricing-plan.entity';
import { SubscriptionDetails } from 'src/entities/subscription-details.entity';
import { PaymentGatewayService } from 'src/api/common/payment-gateway/payment-gateway.service';
import { SubscriptionTransaction } from 'src/entities/subscription-transactions.entity';
import { EmailService } from 'src/libs/@email-services/email.service';
import { EmailTemplates } from 'src/entities/email-templates.entity';
import { BankAccounts } from 'src/entities/banking.entity';
import { NoticeDetails } from 'src/entities/notices-details.entity';
import { JwtInternalService } from 'src/libs/@jwt-internal-services/jwt.internal.service';
import { CompanyUserRoles } from 'src/entities/company-user-roles.entity';
import { EmailQueueProducer } from 'src/libs/@email-services/email-queue/email-queue.producer';
import { BullModule } from '@nestjs/bullmq';
import { StripeCoupons } from 'src/entities/subscription-coupon.entity';
import { CompanyCouponDetails } from 'src/entities/company-coupon-details.entity';
import { IntegrationDetails } from 'src/entities/integration-details.entity';
import { PricingTableFeature } from 'src/entities/pricing-table-feature.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AdminDetails,
      UserDetails,
      CompanyUserRoles,
      SubscriptionItems,
      SubscriptionPlanItems,
      CompanyDetails,
      ActivityLogNew,
      ActivityLogTemplates,
      SubscriptionDetails,
      SubscriptionPlanDetails,
      SubscriptionPricingPlan,
      SubscriptionTransaction,
      EmailTemplates,
      BankAccounts,
      NoticeDetails,
      StripeCoupons,
      CompanyCouponDetails,
      IntegrationDetails,
      PricingTableFeature,
    ]),
    BullModule.registerQueue({
      name: 'mailQueue',
    }),
  ],
  providers: [
    JwtInternalService,
    PtSubscriptionResolver,
    PtSubscriptionService,
    ActivityLogService,
    PaymentGatewayService,
    EmailService,
    EmailQueueProducer,
  ],
})
export class PtSubscriptionModule {}
