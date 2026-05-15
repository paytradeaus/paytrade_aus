import { Injectable } from '@nestjs/common';
import { AiBillingConsumer } from '../../ai-billing/ai-billing-consumer.helper';
import { AiTool, AiToolContext, AiToolError } from '../ai-tool.interface';
import { objectSchema, passthroughSchema } from '../simple-schema';
import { buildToolIdempotencyKey } from './idempotency';
import {
  ProjectSummary,
  RecordSummaryService,
} from '../services/record-summary.service';

interface ProjectSummaryInput {
  projectId?: number;
}

/**
 * Read-only tool: fetch a brief summary of a project the user is
 * currently viewing. Re-validates company membership via the domain
 * service.
 */
@Injectable()
export class GetProjectSummaryTool
  implements AiTool<ProjectSummaryInput, ProjectSummary>
{
  name = 'getProjectSummary';
  description =
    'Returns a read-only summary of a PayTrade project (status, role, retention/PTA/RTA settings, head contract sum, site address). Use when the user is viewing or asking about a specific project.';
  category = 'records';
  riskLevel = 'read' as const;
  reversible = true;
  inputSchema = objectSchema<ProjectSummaryInput>({
    projectId: {
      type: 'integer',
      optional: true,
      description:
        'Project id to look up. If omitted, the project from the current page context is used.',
    },
  });
  outputSchema = passthroughSchema as any;

  constructor(
    private readonly summaries: RecordSummaryService,
    private readonly billingConsumer: AiBillingConsumer,
  ) {}

  protected rawProviderCostUsd(): number {
    return 0;
  }

  async execute(
    input: ProjectSummaryInput,
    context: AiToolContext,
  ): Promise<ProjectSummary> {
    if (context.userId == null) {
      throw new AiToolError(
        'getProjectSummary requires an authenticated user',
        'permission_denied',
      );
    }
    const fromPage =
      context.pageContext?.entity === 'project'
        ? context.pageContext?.entityId
        : undefined;
    const candidate = fromPage ?? input.projectId;
    const projectId = candidate != null ? Number(candidate) : NaN;
    if (!Number.isFinite(projectId) || projectId <= 0) {
      throw new AiToolError(
        'getProjectSummary requires a valid projectId',
        'invalid_input',
      );
    }

    const result = await this.summaries.getProjectForUser(
      context.userId,
      projectId,
      context.companyId ?? null,
    );

    if (context.companyId != null) {
      await this.billingConsumer.consumeOrTopup({
        companyId: context.companyId,
        rawCostUsd: this.rawProviderCostUsd(),
        aiRunId: context.aiRunId ?? null,
        toolCallId: context.idempotencyKey ?? null,
        idempotencyKey: buildToolIdempotencyKey(this.name, context),
        notes: `tool:${this.name}`,
      });
    }
    return result;
  }
}
