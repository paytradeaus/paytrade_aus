import { Module, OnApplicationBootstrap } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';

import { AiToolRegistry } from 'src/entities/ai-tool-registry.entity';
import { AiToolCall } from 'src/entities/ai-tool-call.entity';
import { AiPromptAudit } from 'src/entities/ai-prompt-audit.entity';
import { ActivityLogNew } from 'src/entities/activity-log-new.entity';
import { CompanyDetails } from 'src/entities/company-details.entity';
import { UserDetails } from 'src/entities/user-details.entity';
import { CompanyUserRoles } from 'src/entities/company-user-roles.entity';
import { ContractDetails } from 'src/entities/contract-details.entity';
import { ProjectDetails } from 'src/entities/project-details.entity';
import { PaymentClaims } from 'src/entities/banking.entity';
import { PaymentDetails } from 'src/entities/payment-details.entity';
import { ClientSuppliersDetails } from 'src/entities/client-suppliers-details.entity';

import { AiBillingModule } from '../ai-billing/ai-billing.module';

import { AiToolRegistryService } from './ai-tool-registry.service';
import { AiPromptAuditService } from './ai-prompt-audit.service';
import { AiActivityLogHelper } from './ai-activity-log.helper';

import { SystemStatusService } from './services/system-status.service';
import { BusinessProfileService } from './services/business-profile.service';
import { PageContextService } from './services/page-context.service';
import { RecordSummaryService } from './services/record-summary.service';

import { GetSystemStatusSnapshotTool } from './tools/get-system-status-snapshot.tool';
import { GetCurrentPageContextTool } from './tools/get-current-page-context.tool';
import { GetBusinessProfileSummaryTool } from './tools/get-business-profile-summary.tool';
import { GetClaimSummaryTool } from './tools/get-claim-summary.tool';
import { GetContractSummaryTool } from './tools/get-contract-summary.tool';
import { GetProjectSummaryTool } from './tools/get-project-summary.tool';

/** Wires the registry, audit log, activity-log helper and the read-only example tools. */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      AiToolRegistry,
      AiToolCall,
      AiPromptAudit,
      ActivityLogNew,
      CompanyDetails,
      UserDetails,
      CompanyUserRoles,
      ContractDetails,
      ProjectDetails,
      PaymentClaims,
      PaymentDetails,
      ClientSuppliersDetails,
    ]),
    AiBillingModule,
  ],
  providers: [
    AiToolRegistryService,
    AiPromptAuditService,
    AiActivityLogHelper,
    SystemStatusService,
    BusinessProfileService,
    PageContextService,
    RecordSummaryService,
    GetSystemStatusSnapshotTool,
    GetCurrentPageContextTool,
    GetBusinessProfileSummaryTool,
    GetClaimSummaryTool,
    GetContractSummaryTool,
    GetProjectSummaryTool,
  ],
  exports: [
    AiToolRegistryService,
    AiPromptAuditService,
    AiActivityLogHelper,
    SystemStatusService,
    BusinessProfileService,
    PageContextService,
    RecordSummaryService,
  ],
})
export class AiToolsModule implements OnApplicationBootstrap {
  private readonly logger = new PaytradeLogger('AI_TOOLS_MODULE');

  constructor(
    private readonly registry: AiToolRegistryService,
    private readonly snapshotTool: GetSystemStatusSnapshotTool,
    private readonly pageContextTool: GetCurrentPageContextTool,
    private readonly profileTool: GetBusinessProfileSummaryTool,
    private readonly claimTool: GetClaimSummaryTool,
    private readonly contractTool: GetContractSummaryTool,
    private readonly projectTool: GetProjectSummaryTool,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      await this.registry.register(this.snapshotTool);
      await this.registry.register(this.pageContextTool);
      await this.registry.register(this.profileTool);
      await this.registry.register(this.claimTool);
      await this.registry.register(this.contractTool);
      await this.registry.register(this.projectTool);
      this.logger.log(
        `Registered ${this.registry.list().length} AI tool(s).`,
      );
    } catch (error) {
      this.logger.error(`AI tool registration failed: ${error}`);
    }
  }
}
