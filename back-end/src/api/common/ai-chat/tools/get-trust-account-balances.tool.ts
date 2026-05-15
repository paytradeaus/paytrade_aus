import { Injectable } from '@nestjs/common';
import {
  AiTool,
  AiToolContext,
  AiToolError,
} from '../../ai-tools/ai-tool.interface';
import { objectSchema, passthroughSchema } from '../../ai-tools/simple-schema';
import {
  AiChatInspectionService,
  TrustAccountBalance,
} from '../services/inspection.service';

interface Input {
  companyId?: number;
}

@Injectable()
export class GetTrustAccountBalancesTool
  implements AiTool<Input, { accounts: TrustAccountBalance[] }>
{
  name = 'getTrustAccountBalances';
  description =
    'Lists the business\'s Project Trust Accounts and Retention Trust Accounts with their current recorded balance, status, BSB, and last 4 digits of the account number. Cash accounts are excluded. Read-only.';
  category = 'inspection';
  riskLevel = 'read' as const;
  reversible = true;

  inputSchema = objectSchema<Input>({
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
        'A business profile is required to read trust account balances.',
        'invalid_input',
      );
    }
    const accounts = await this.inspection.getTrustAccountBalances(
      ctx.userId,
      companyId,
    );
    return { accounts };
  }
}
