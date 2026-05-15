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

import { AiToolRegistryService } from './ai-tool-registry.service';
import { AiPromptAuditService } from './ai-prompt-audit.service';
import { AiActivityLogHelper } from './ai-activity-log.helper';

import { SystemStatusService } from './services/system-status.service';
import { BusinessProfileService } from './services/business-profile.service';
import { PageContextService } from './services/page-context.service';

import { GetSystemStatusSnapshotTool } from './tools/get-system-status-snapshot.tool';
import { GetCurrentPageContextTool } from './tools/get-current-page-context.tool';
import { GetBusinessProfileSummaryTool } from './tools/get-business-profile-summary.tool';

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
    ]),
  ],
  providers: [
    AiToolRegistryService,
    AiPromptAuditService,
    AiActivityLogHelper,
    SystemStatusService,
    BusinessProfileService,
    PageContextService,
    GetSystemStatusSnapshotTool,
    GetCurrentPageContextTool,
    GetBusinessProfileSummaryTool,
  ],
  exports: [
    AiToolRegistryService,
    AiPromptAuditService,
    AiActivityLogHelper,
    SystemStatusService,
    BusinessProfileService,
    PageContextService,
  ],
})
export class AiToolsModule implements OnApplicationBootstrap {
  private readonly logger = new PaytradeLogger('AI_TOOLS_MODULE');

  constructor(
    private readonly registry: AiToolRegistryService,
    private readonly snapshotTool: GetSystemStatusSnapshotTool,
    private readonly pageContextTool: GetCurrentPageContextTool,
    private readonly profileTool: GetBusinessProfileSummaryTool,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      await this.registry.register(this.snapshotTool);
      await this.registry.register(this.pageContextTool);
      await this.registry.register(this.profileTool);
      this.logger.log(
        `Registered ${this.registry.list().length} AI tool(s).`,
      );
    } catch (error) {
      this.logger.error(`AI tool registration failed: ${error}`);
    }
  }
}
