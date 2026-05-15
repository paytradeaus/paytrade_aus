import { Injectable } from '@nestjs/common';
import {
  AiTool,
  AiToolContext,
  AiToolError,
} from '../../ai-tools/ai-tool.interface';
import { objectSchema, passthroughSchema } from '../../ai-tools/simple-schema';
import {
  AiChatInspectionService,
  RetentionsHeldResult,
} from '../services/inspection.service';

interface Input {
  companyId?: number;
  limit?: number;
}

@Injectable()
export class GetRetentionsHeldTool
  implements AiTool<Input, RetentionsHeldResult>
{
  name = 'getRetentionsHeld';
  description =
    'Returns the total currently-held cash retention for the business, plus the top counterparties by retained amount. Read-only.';
  category = 'inspection';
  riskLevel = 'read' as const;
  reversible = true;

  inputSchema = objectSchema<Input>({
    companyId: { type: 'integer', optional: true },
    limit: {
      type: 'integer',
      optional: true,
      description: 'Max number of grouped counterparty rows to return (default 10).',
    },
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
        'A business profile is required to read retention balances.',
        'invalid_input',
      );
    }
    return this.inspection.getRetentionsHeld(
      ctx.userId,
      companyId,
      input.limit ?? 10,
    );
  }
}
