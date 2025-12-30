import { Module } from '@nestjs/common';
import { PtFaqService } from './pt-faq.service';
import { PtFaqResolver } from './pt-faq.resolver';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FAQ } from '../../../entities/admin-faq.entity';
import { MasterTypes } from '../../../entities/master-types.entity';
import { UserDetails } from 'src/entities/user-details.entity';
import { AdminDetails } from 'src/entities/admin-details.entity';
import { EmailTemplates } from 'src/entities/email-templates.entity';
import { ActivityLogService } from 'src/api/common/activity-log/activity-log.service';
import { ActivityLogNew } from 'src/entities/activity-log-new.entity';
import { ActivityLogTemplates } from 'src/entities/activity-log-templates.entity';
import { CompanyDetails } from 'src/entities/company-details.entity';
import { BankAccounts } from 'src/entities/banking.entity';
import { NoticeDetails } from 'src/entities/notices-details.entity';
import { JwtInternalService } from 'src/libs/@jwt-internal-services/jwt.internal.service';
import { CompanyUserRoles } from 'src/entities/company-user-roles.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FAQ,
      UserDetails,
      CompanyUserRoles,
      AdminDetails,
      MasterTypes,
      ActivityLogNew,
      ActivityLogTemplates,
      CompanyDetails,
      BankAccounts,
      NoticeDetails,
    ]),
  ],
  providers: [
    JwtInternalService,
    PtFaqService,
    PtFaqResolver,
    ActivityLogService,
  ],
})
export class PtFaqModule {}
