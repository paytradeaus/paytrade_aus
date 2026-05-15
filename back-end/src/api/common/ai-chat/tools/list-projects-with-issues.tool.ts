import { Injectable } from '@nestjs/common';
import {
  AiTool,
  AiToolContext,
  AiToolError,
} from '../../ai-tools/ai-tool.interface';
import { objectSchema, passthroughSchema } from '../../ai-tools/simple-schema';
import {
  AiChatInspectionService,
  ProjectIssueSummary,
} from '../services/inspection.service';

interface Input {
  companyId?: number;
  limit?: number;
}

@Injectable()
export class ListProjectsWithIssuesTool
  implements AiTool<Input, { projects: ProjectIssueSummary[] }>
{
  name = 'listProjectsWithIssues';
  description =
    'Lists active projects for the current business that have configuration or compliance issues (e.g. PTA/RTA action required, missing site address, missing head contract sum, missing role or retention type). Read-only.';
  category = 'inspection';
  riskLevel = 'read' as const;
  reversible = true;

  inputSchema = objectSchema<Input>({
    companyId: { type: 'integer', optional: true },
    limit: { type: 'integer', optional: true },
  });
  outputSchema = passthroughSchema as any;

  constructor(private readonly inspection: AiChatInspectionService) {}

  async execute(input: Input, ctx: AiToolContext) {
    if (ctx.userId == null) {
      throw new AiToolError('Authentication required', 'permission_denied');
    }
    const companyId = ctx.companyId ?? input.companyId ?? null;
    if (companyId == null) {
      throw new AiToolError(
        'A business profile is required to list project issues.',
        'invalid_input',
      );
    }
    const projects = await this.inspection.listProjectsWithIssues(
      ctx.userId,
      companyId,
      input.limit ?? 25,
    );
    return { projects };
  }
}
