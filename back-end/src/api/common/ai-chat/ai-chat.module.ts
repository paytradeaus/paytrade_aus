import { Module, OnApplicationBootstrap } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from 'src/api/auth/constants';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { UserDetails } from 'src/entities/user-details.entity';
import { AiChatThread } from 'src/entities/ai-chat-thread.entity';
import { AiChatMessage } from 'src/entities/ai-chat-message.entity';
import { AiConversation } from 'src/entities/ai-conversation.entity';
import { AiRun } from 'src/entities/ai-run.entity';
import { ClientSuppliersDetails } from 'src/entities/client-suppliers-details.entity';
import { ContractDetails } from 'src/entities/contract-details.entity';
import { CompanyUserRoles } from 'src/entities/company-user-roles.entity';
import { PaymentClaims } from 'src/entities/banking.entity';
import { JwtInternalService } from 'src/libs/@jwt-internal-services/jwt.internal.service';

import { AiSupportModule } from '../ai-support/ai-support.module';
import { AiToolsModule } from '../ai-tools/ai-tools.module';
import { AiBillingModule } from '../ai-billing/ai-billing.module';
import { AiToolRegistryService } from '../ai-tools/ai-tool-registry.service';

import { AiChatService } from './ai-chat.service';
import { AiChatResolver } from './ai-chat.resolver';
import { AiChatController } from './ai-chat.controller';
import { AiChatRunsService } from './services/ai-chat-runs.service';
import { AiChatEventsService } from './services/ai-chat-events.service';
import { AiChatOrchestratorService } from './services/ai-chat-orchestrator.service';
import { AiChatInspectionService } from './services/inspection.service';
import { OpenAiLlmProvider } from './llm/openai.llm-provider';
import { LLM_PROVIDER } from './llm/llm-provider.interface';

import { ListClaimsWithIssuesTool } from './tools/list-claims-with-issues.tool';
import { GetClaimDetailsTool } from './tools/get-claim-details.tool';
import { ListContactsMissingDetailsTool } from './tools/list-contacts-missing-details.tool';
import { RequestUserViewNavigationTool } from './tools/request-user-view-navigation.tool';

/**
 * Task #162 — Read-only AI Chat Agent.
 *
 * Wires the SSE controller, orchestrator, runs/events services, the
 * OpenAI LLM provider, the inspection helper, and the four new
 * read-only tools. The legacy GraphQL chat (`AiChatResolver` +
 * `AiChatService` over `AiSupportService`) is left in place so
 * existing callers don't break while the frontend migrates.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserDetails,
      AiChatThread,
      AiChatMessage,
      AiConversation,
      AiRun,
      ClientSuppliersDetails,
      ContractDetails,
      CompanyUserRoles,
      PaymentClaims,
    ]),
    JwtModule.register({
      secret: jwtConstants.secret,
      signOptions: { expiresIn: '7d' },
    }),
    AiSupportModule,
    AiToolsModule,
    AiBillingModule,
  ],
  controllers: [AiChatController],
  providers: [
    JwtInternalService,
    // Legacy GraphQL chat
    AiChatService,
    AiChatResolver,
    // New REST chat
    AiChatRunsService,
    AiChatEventsService,
    AiChatInspectionService,
    OpenAiLlmProvider,
    { provide: LLM_PROVIDER, useExisting: OpenAiLlmProvider },
    AiChatOrchestratorService,
    // New tools
    ListClaimsWithIssuesTool,
    GetClaimDetailsTool,
    ListContactsMissingDetailsTool,
    RequestUserViewNavigationTool,
  ],
  exports: [AiChatService, AiChatEventsService, AiChatRunsService],
})
export class AiChatModule implements OnApplicationBootstrap {
  private readonly logger = new PaytradeLogger('AI_CHAT_MODULE');

  constructor(
    private readonly registry: AiToolRegistryService,
    private readonly listClaims: ListClaimsWithIssuesTool,
    private readonly getClaim: GetClaimDetailsTool,
    private readonly listContacts: ListContactsMissingDetailsTool,
    private readonly requestNav: RequestUserViewNavigationTool,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      await this.registry.register(this.listClaims);
      await this.registry.register(this.getClaim);
      await this.registry.register(this.listContacts);
      await this.registry.register(this.requestNav);
      this.logger.log(
        `AiChatModule registered ${this.registry.list().length} total tool(s).`,
      );
    } catch (err) {
      this.logger.error(`AiChatModule tool registration failed: ${err}`);
    }
  }
}
