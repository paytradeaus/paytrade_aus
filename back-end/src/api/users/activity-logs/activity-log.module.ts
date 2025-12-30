import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyDetails } from 'src/entities/company-details.entity';
import { ActivityLogTemplates } from 'src/entities/activity-log-templates.entity';
import { SubscriptionPlanItems } from 'src/entities/subscription-plan-items.entity';
import { AdminDetails } from 'src/entities/admin-details.entity';
import { UserDetails } from 'src/entities/user-details.entity';
import { SubscriptionDetails } from 'src/entities/subscription-details.entity';
import { SubscriptionPlanDetails } from 'src/entities/subscription-plan-details.entity';
import { SubscriptionPricingPlan } from 'src/entities/subscription-pricing-plan.entity';
import { SubscriptionTransaction } from 'src/entities/subscription-transactions.entity';
import { ActivityLogService } from 'src/api/common/activity-log/activity-log.service';
import { ActivityLogResolver } from 'src/api/common/activity-log/activity-log.resolver';
import { UserActivityLogService } from './activity-log.service';
import { UserActivityLogResolver } from './activity-log.resolver';
import { ActivityLogNew } from 'src/entities/activity-log-new.entity';
import { BankAccounts } from 'src/entities/banking.entity';
import { NoticeDetails } from 'src/entities/notices-details.entity';
import { JwtInternalService } from 'src/libs/@jwt-internal-services/jwt.internal.service';
import { CompanyUserRoles } from 'src/entities/company-user-roles.entity';

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
    ]),
  ],
  providers: [
    JwtInternalService,
    UserActivityLogResolver,
    UserActivityLogService,
    ActivityLogService,
  ],
})
export class UserActivityLogModule {}
