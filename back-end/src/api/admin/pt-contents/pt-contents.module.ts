import { Module } from '@nestjs/common';
import { PtContentsService } from './pt-contents.service';
import { PtContentsResolver } from './pt-contents.resolver';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserDetails } from 'src/entities/user-details.entity';
import { AdminDetails } from 'src/entities/admin-details.entity';
import { MasterTypes } from 'src/entities/master-types.entity';
import { Contents } from 'src/entities/admin-contents.entity';
import { EmailTemplates } from 'src/entities/email-templates.entity';
import { BlogResource } from 'src/entities/admin-blogs-resources.entity';
import { BlogComments } from 'src/entities/admin-blog-comments.entity';
import { FileAttachments } from 'src/entities/file-attachments.entity';
import { ActivityLogNew } from 'src/entities/activity-log-new.entity';
import { ActivityLogTemplates } from 'src/entities/activity-log-templates.entity';
import { ActivityLogService } from 'src/api/common/activity-log/activity-log.service';
import { CompanyDetails } from 'src/entities/company-details.entity';
import { BankAccounts } from 'src/entities/banking.entity';
import { NoticeDetails } from 'src/entities/notices-details.entity';
import { JwtInternalService } from 'src/libs/@jwt-internal-services/jwt.internal.service';
import { CompanyUserRoles } from 'src/entities/company-user-roles.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserDetails,
      CompanyUserRoles,
      AdminDetails,
      CompanyDetails,
      MasterTypes,
      Contents,
      EmailTemplates,
      BlogResource,
      BlogComments,
      FileAttachments,
      ActivityLogNew,
      ActivityLogTemplates,
      BankAccounts,
      NoticeDetails,
    ]),
  ],
  providers: [
    JwtInternalService,
    PtContentsService,
    PtContentsResolver,
    ActivityLogService,
  ],
})
export class PtTextContentsModule {}
