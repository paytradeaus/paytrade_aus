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
  paymentClaimId: number;
  companyId?: number;
}

@Injectable()
export class GetClaimDetailsTool
  implements AiTool<Input, { claim: ClaimSummary | null }>
{
  name = 'getClaimDetails';
  description =
    'Fetches a single payment claim by id (scoped to the current business). Read-only.';
  category = 'inspection';
  riskLevel = 'read' as const;
  reversible = true;

  inputSchema = objectSchema<Input>({
    paymentClaimId: { type: 'integer' },
    companyId: { type: 'integer', optional: true },
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
        'A business profile is required to fetch a claim.',
        'invalid_input',
      );
    }
    const claim = await this.inspection.getClaimDetails(
      ctx.userId,
      companyId,
      input.paymentClaimId,
    );
    return { claim };
  }
}
