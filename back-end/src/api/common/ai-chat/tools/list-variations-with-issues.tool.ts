import { Injectable } from '@nestjs/common';
import {
  AiTool,
  AiToolContext,
  AiToolError,
} from '../../ai-tools/ai-tool.interface';
import { objectSchema, passthroughSchema } from '../../ai-tools/simple-schema';
import {
  AiChatInspectionService,
  VariationIssueSummary,
} from '../services/inspection.service';

interface Input {
  companyId?: number;
  limit?: number;
}

@Injectable()
export class ListVariationsWithIssuesTool
  implements AiTool<Input, { variations: VariationIssueSummary[] }>
{
  name = 'listVariationsWithIssues';
  description =
    'Lists variations for the current business that are pending (Draft or In Review) or otherwise need attention (missing variation amount or name). Read-only.';
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
        'A business profile is required to list variation issues.',
        'invalid_input',
      );
    }
    const variations = await this.inspection.listVariationsWithIssues(
      ctx.userId,
      companyId,
      input.limit ?? 25,
    );
    return { variations };
  }
}
