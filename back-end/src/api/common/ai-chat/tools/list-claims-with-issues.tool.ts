import { Injectable } from '@nestjs/common';
import {
  AiTool,
  AiToolContext,
  AiToolError,
} from '../../ai-tools/ai-tool.interface';
import { objectSchema, passthroughSchema } from '../../ai-tools/simple-schema';
import {
  AiChatInspectionService,
  ClaimSummary,
} from '../services/inspection.service';

interface Input {
  companyId?: number;
  limit?: number;
}

@Injectable()
export class ListClaimsWithIssuesTool
  implements AiTool<Input, { claims: ClaimSummary[] }>
{
  name = 'listClaimsWithIssues';
  description =
    'Lists payment claims for the current business that have configuration issues (e.g. retention misconfigured) or are overdue. Read-only.';
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
        'A business profile is required to list claim issues.',
        'invalid_input',
      );
    }
    const claims = await this.inspection.listClaimsWithIssues(
      ctx.userId,
      companyId,
      input.limit ?? 25,
    );
    return { claims };
  }
}
