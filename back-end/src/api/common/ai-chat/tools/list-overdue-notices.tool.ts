import { Injectable } from '@nestjs/common';
import {
  AiTool,
  AiToolContext,
  AiToolError,
} from '../../ai-tools/ai-tool.interface';
import { objectSchema, passthroughSchema } from '../../ai-tools/simple-schema';
import {
  AiChatInspectionService,
  OverdueNoticeSummary,
} from '../services/inspection.service';

interface Input {
  companyId?: number;
  limit?: number;
  overdueAfterDays?: number;
}

@Injectable()
export class ListOverdueNoticesTool
  implements AiTool<Input, { notices: OverdueNoticeSummary[] }>
{
  name = 'listOverdueNotices';
  description =
    'Lists notices for the current business that are overdue — i.e. still in Draft/Not Sent and dated more than `overdueAfterDays` (default 7) days ago, or stuck in Sending. Read-only.';
  category = 'inspection';
  riskLevel = 'read' as const;
  reversible = true;

  inputSchema = objectSchema<Input>({
    companyId: { type: 'integer', optional: true },
    limit: { type: 'integer', optional: true },
    overdueAfterDays: { type: 'integer', optional: true },
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
        'A business profile is required to list overdue notices.',
        'invalid_input',
      );
    }
    const notices = await this.inspection.listOverdueNotices(
      ctx.userId,
      companyId,
      input.limit ?? 25,
      input.overdueAfterDays ?? 7,
    );
    return { notices };
  }
}
