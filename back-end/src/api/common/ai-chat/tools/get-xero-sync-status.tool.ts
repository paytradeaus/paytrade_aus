import { Injectable } from '@nestjs/common';
import {
  AiTool,
  AiToolContext,
  AiToolError,
} from '../../ai-tools/ai-tool.interface';
import { objectSchema, passthroughSchema } from '../../ai-tools/simple-schema';
import {
  AiChatInspectionService,
  XeroSyncStatusSummary,
} from '../services/inspection.service';

interface Input {
  companyId?: number;
}

@Injectable()
export class GetXeroSyncStatusTool
  implements AiTool<Input, XeroSyncStatusSummary>
{
  name = 'getXeroSyncStatus';
  description =
    'Returns the health of the business\'s Xero integration: whether it is connected, the tenant name, current status, whether re-authentication is required, and a count of sync logs and errors in the last 7 days. Read-only.';
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
        'A business profile is required to read Xero sync status.',
        'invalid_input',
      );
    }
    return this.inspection.getXeroSyncStatus(ctx.userId, companyId);
  }
}
