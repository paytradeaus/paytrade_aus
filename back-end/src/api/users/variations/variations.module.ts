import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VariationsService } from './variations.service';
import { VariationsResolver } from './variations.resolver';
import { UserDetails } from 'src/entities/user-details.entity';
import { AdminDetails } from 'src/entities/admin-details.entity';
import { CompanyDetails } from 'src/entities/company-details.entity';
import { ProjectDetails } from 'src/entities/project-details.entity';
import { ContractDetails } from 'src/entities/contract-details.entity';
import { ActivityLogTemplates } from 'src/entities/activity-log-templates.entity';
import { ActivityLogService } from 'src/api/common/activity-log/activity-log.service';
import { VariationDetails } from 'src/entities/variation-details.entity';
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
      AdminDetails,
      ProjectDetails,
      VariationDetails,
      ContractDetails,
      ActivityLogNew,
      ActivityLogTemplates,
      BankAccounts,
      NoticeDetails,
    ]),
  ],
  providers: [
    JwtInternalService,
    VariationsResolver,
    VariationsService,
    ActivityLogService,
  ],
  exports: [VariationsService],
})
export class VariationsModule {}
