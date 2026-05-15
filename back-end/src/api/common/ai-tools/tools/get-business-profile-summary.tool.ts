import { Injectable } from '@nestjs/common';
import { AiBillingConsumer } from '../../ai-billing/ai-billing-consumer.helper';
import { AiTool, AiToolContext, AiToolError } from '../ai-tool.interface';
import { objectSchema } from '../simple-schema';
import { buildToolIdempotencyKey } from './idempotency';
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

  constructor(
    private readonly profileService: BusinessProfileService,
    private readonly billingConsumer: AiBillingConsumer,
  ) {}

  /**
   * Read-only tool: no AI provider call, so the raw cost is $0. Wired
   * through the billing consumer anyway so every tool exercises the
   * same charge path (Task #167).
   */
  protected rawProviderCostUsd(
    _input: SummaryInput,
    _output: BusinessProfileSummary,
  ): number {
    return 0;
  }

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
    const result = await this.profileService.getSummaryForUser(
      context.userId,
      companyId,
    );
    await this.billingConsumer.consumeOrTopup({
      companyId,
      rawCostUsd: this.rawProviderCostUsd(input, result),
      aiRunId: context.aiRunId ?? null,
      toolCallId: context.idempotencyKey ?? null,
      idempotencyKey: buildToolIdempotencyKey(this.name, context),
      notes: `tool:${this.name}`,
    });
    return result;
  }
}
