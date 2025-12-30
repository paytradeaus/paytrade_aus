import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityLogService } from './activity-log.service';
import { ActivityLogResolver } from './activity-log.resolver';
import { UserDetails } from 'src/entities/user-details.entity';
import { CompanyDetails } from 'src/entities/company-details.entity';
import { ActivityLogTemplates } from 'src/entities/activity-log-templates.entity';
import { AdminDetails } from 'src/entities/admin-details.entity';
import { ActivityLogNew } from 'src/entities/activity-log-new.entity';
import { BankAccounts } from 'src/entities/banking.entity';
import { NoticeDetails } from 'src/entities/notices-details.entity';
import { JwtInternalService } from 'src/libs/@jwt-internal-services/jwt.internal.service';
import { CompanyUserRoles } from 'src/entities/company-user-roles.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserDetails,
      CompanyDetails,
      CompanyUserRoles,
      ActivityLogTemplates,
      ActivityLogNew,
      AdminDetails,
      BankAccounts,
      NoticeDetails,
    ]),
  ],
  providers: [JwtInternalService, ActivityLogResolver, ActivityLogService],
  exports: [ActivityLogService],
})
export class ActivityLogModule {}
