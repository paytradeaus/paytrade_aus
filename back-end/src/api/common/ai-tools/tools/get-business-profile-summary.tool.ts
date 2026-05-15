import { Injectable } from '@nestjs/common';
import { AiTool, AiToolContext, AiToolError } from '../ai-tool.interface';
import { objectSchema } from '../simple-schema';
import {
  BusinessProfileService,
  BusinessProfileSummary,
} from '../services/business-profile.service';

interface SummaryInput {
  companyId?: number;
}

/** Read-only example tool. Wraps BusinessProfileService; server-side companyId wins. */
@Injectable()
export class GetBusinessProfileSummaryTool
  implements AiTool<SummaryInput, BusinessProfileSummary>
{
  name = 'getBusinessProfileSummary';
  description =
    'Returns a summary (name, entity type, contact details, address) of the caller\u2019s business profile.';
  category = 'business-profile';
  riskLevel = 'read' as const;
  reversible = true;
  inputSchema = objectSchema<SummaryInput>({
    companyId: {
      type: 'integer',
      optional: true,
      description:
        'Optional business profile id. Server-side context wins when present.',
    },
  });
  outputSchema = objectSchema<BusinessProfileSummary>({
    companyId: { type: 'integer' },
    companyName: { type: 'string' },
    legalName: { type: 'string', optional: true },
    entityType: { type: 'string' },
    email: { type: 'string' },
    phone: { type: 'string' },
    address: { type: 'string' },
  });

  constructor(private readonly profileService: BusinessProfileService) {}

  async execute(
    input: SummaryInput,
    context: AiToolContext,
  ): Promise<BusinessProfileSummary> {
    if (context.userId == null) {
      throw new AiToolError(
        'getBusinessProfileSummary requires an authenticated user',
        'permission_denied',
      );
    }
    const companyId = context.companyId ?? input.companyId ?? null;
    if (companyId == null) {
      throw new AiToolError(
        'getBusinessProfileSummary requires a companyId',
        'invalid_input',
      );
    }
    return this.profileService.getSummaryForUser(context.userId, companyId);
  }
}
