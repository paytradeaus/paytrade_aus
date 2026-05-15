import { Injectable } from '@nestjs/common';
import {
  AiTool,
  AiToolContext,
  AiToolError,
} from '../../ai-tools/ai-tool.interface';
import { objectSchema, passthroughSchema } from '../../ai-tools/simple-schema';
import {
  AiChatInspectionService,
  ContactSummary,
} from '../services/inspection.service';

interface Input {
  companyId?: number;
  limit?: number;
}

@Injectable()
export class ListContactsMissingDetailsTool
  implements AiTool<Input, { contacts: ContactSummary[] }>
{
  name = 'listContactsMissingDetails';
  description =
    'Lists active contacts (clients or suppliers) that are missing an email address or are flagged as needing one. Read-only.';
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
        'A business profile is required.',
        'invalid_input',
      );
    }
    const contacts = await this.inspection.listContactsMissingDetails(
      ctx.userId,
      companyId,
      input.limit ?? 25,
    );
    return { contacts };
  }
}
