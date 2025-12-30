import { Module } from '@nestjs/common';
import { PtGroupsService } from './pt-groups.service';
import { PtGroupsResolver } from './pt-groups.resolver';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminDetails } from '../../../entities/admin-details.entity';
import { AdminGroupDetails } from '../../../entities/admin-group-details.entity';
import { AdminGroup } from '../../../entities/admin-group.entity';
import { PtAdminService } from '../pt-admin/pt-admin.service';
import { AdminGroupMenuPriv } from '../../../entities/admin-group-menu-priv.entity';
import { AdminMenuDetails } from '../../../entities/admin-menu-details.entity';
import { UserDetails } from 'src/entities/user-details.entity';
import { EmailService } from 'src/libs/@email-services/email.service';
import { FileAttachments } from 'src/entities/file-attachments.entity';
import { MasterTypes } from 'src/entities/master-types.entity';
import { EmailGenerator } from 'src/libs/@email-services/email-template-generators/email-generators';
import { CommunicationEmails } from 'src/entities/communication-emails.entity';
import { ActivityLogNew } from 'src/entities/activity-log-new.entity';
import { ActivityLogService } from 'src/api/common/activity-log/activity-log.service';
import { ActivityLogTemplates } from 'src/entities/activity-log-templates.entity';
import { CompanyDetails } from 'src/entities/company-details.entity';
import { AdminEmailVerificationDetails } from 'src/entities/admin-email-verification.entity';
import { BankAccounts } from 'src/entities/banking.entity';
import { NoticeDetails } from 'src/entities/notices-details.entity';
import { JwtInternalService } from 'src/libs/@jwt-internal-services/jwt.internal.service';
import { CompanyUserRoles } from 'src/entities/company-user-roles.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CompanyUserRoles,
      AdminDetails,
      AdminGroupDetails,
      AdminGroup,
      AdminMenuDetails,
      AdminGroupMenuPriv,
      CommunicationEmails,
      FileAttachments,
      UserDetails,
      MasterTypes,
      ActivityLogNew,
      ActivityLogTemplates,
      CompanyDetails,
      AdminEmailVerificationDetails,
      BankAccounts,
      NoticeDetails,
    ]),
  ],
  providers: [
    JwtInternalService,
    PtGroupsService,
    PtAdminService,
    EmailService,
    PtGroupsResolver,
    EmailGenerator,
    ActivityLogService,
  ],
  exports: [PtGroupsService],
})
export class PtGroupsModule {}
