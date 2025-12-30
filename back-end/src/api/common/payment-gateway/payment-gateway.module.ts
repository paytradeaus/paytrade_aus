import { Module } from '@nestjs/common';
import { PaymentGatewayResolver } from './payment-gateway.resolver';
import { PaymentGatewayService } from './payment-gateway.service';
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
import { SubscriptionTransaction } from 'src/entities/subscription-transactions.entity';
import { ActivityLogNew } from 'src/entities/activity-log-new.entity';
import { BankAccounts } from 'src/entities/banking.entity';
import { NoticeDetails } from 'src/entities/notices-details.entity';
import { AuthService } from 'src/api/auth/auth-guard/auth.service';
import { CompanyUserRoles } from 'src/entities/company-user-roles.entity';
import { JwtInternalService } from 'src/libs/@jwt-internal-services/jwt.internal.service';
import { StripeCoupons } from 'src/entities/subscription-coupon.entity';
import { CompanyCouponDetails } from 'src/entities/company-coupon-details.entity';
import { IntegrationDetails } from 'src/entities/integration-details.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AdminDetails,
      UserDetails,
      CompanyDetails,
      SubscriptionPlanItems,
      ActivityLogNew,
      ActivityLogTemplates,
      SubscriptionDetails,
      SubscriptionPlanDetails,
      SubscriptionPricingPlan,
      BankAccounts,
      NoticeDetails,
      SubscriptionTransaction,
      CompanyUserRoles,
      StripeCoupons,
      CompanyCouponDetails,
      IntegrationDetails,
    ]),
  ],
  providers: [
    JwtInternalService,
    PaymentGatewayResolver,
    PaymentGatewayService,
    ActivityLogService,
    AuthService,
  ],
})
export class PaymentGatewayModule {}
