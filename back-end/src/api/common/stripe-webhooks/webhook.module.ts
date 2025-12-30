import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyDetails } from 'src/entities/company-details.entity';
import { ActivityLogTemplates } from 'src/entities/activity-log-templates.entity';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { SubscriptionPlanItems } from 'src/entities/subscription-plan-items.entity';
import { AdminDetails } from 'src/entities/admin-details.entity';
import { UserDetails } from 'src/entities/user-details.entity';
import { SubscriptionDetails } from 'src/entities/subscription-details.entity';
import { SubscriptionPlanDetails } from 'src/entities/subscription-plan-details.entity';
import { SubscriptionPricingPlan } from 'src/entities/subscription-pricing-plan.entity';
import { StripeWebhookResolver } from './webhook.resolver';
import { StripeWebhookService } from './webhook.service';
import { SubscriptionTransaction } from 'src/entities/subscription-transactions.entity';
import { PaymentGatewayService } from '../payment-gateway/payment-gateway.service';
import { ActivityLogNew } from 'src/entities/activity-log-new.entity';
import { BankAccounts } from 'src/entities/banking.entity';
import { NoticeDetails } from 'src/entities/notices-details.entity';
import { CompanyUserRoles } from 'src/entities/company-user-roles.entity';
import { StripeCoupons } from 'src/entities/subscription-coupon.entity';
import { CompanyCouponDetails } from 'src/entities/company-coupon-details.entity';
import { IntegrationDetails } from 'src/entities/integration-details.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AdminDetails,
      UserDetails,
      CompanyUserRoles,
      CompanyDetails,
      SubscriptionPlanItems,
      ActivityLogNew,
      ActivityLogTemplates,
      SubscriptionDetails,
      SubscriptionPlanDetails,
      SubscriptionPricingPlan,
      SubscriptionTransaction,
      BankAccounts,
      NoticeDetails,
      StripeCoupons,
      CompanyCouponDetails,
      IntegrationDetails,
    ]),
  ],
  controllers: [StripeWebhookResolver],
  providers: [StripeWebhookService, PaymentGatewayService, ActivityLogService],
})
export class StripeWebhookModule {}
