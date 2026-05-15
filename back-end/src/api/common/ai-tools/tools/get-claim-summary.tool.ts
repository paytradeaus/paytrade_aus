import { Injectable } from '@nestjs/common';
import { AiBillingConsumer } from '../../ai-billing/ai-billing-consumer.helper';
import { AiTool, AiToolContext, AiToolError } from '../ai-tool.interface';
import { objectSchema, passthroughSchema } from '../simple-schema';
import { buildToolIdempotencyKey } from './idempotency';
import {
  ClaimSummary,
  RecordSummaryService,
} from '../services/record-summary.service';

interface ClaimSummaryInput {
  claimId?: number;
}

/**
 * Read-only tool: fetch a brief summary of a payment claim the user
 * is currently viewing. The claim id is preferred from
 * `context.pageContext.entityId` when the entity matches, falling
 * back to `input.claimId`. Membership in the owning company is
 * re-validated server-side.
 */
@Injectable()
export class GetClaimSummaryTool
  implements AiTool<ClaimSummaryInput, ClaimSummary>
{
  name = 'getClaimSummary';
  description =
    'Returns a read-only summary of a PayTrade payment claim (status, amounts, retention, dates, contract/project/counterparty). Use when the user is viewing or asking about a specific claim.';
  category = 'records';
  riskLevel = 'read' as const;
  reversible = true;
  inputSchema = objectSchema<ClaimSummaryInput>({
    claimId: {
      type: 'integer',
      optional: true,
      description:
        'Claim id to look up. If omitted, the claim from the current page context is used.',
    },
  });
  // Output is a structured object — kept loose to avoid revalidation
  // pain for nullable fields. The shape is documented by ClaimSummary.
  outputSchema = passthroughSchema as any;

  constructor(
    private readonly summaries: RecordSummaryService,
    private readonly billingConsumer: AiBillingConsumer,
  ) {}

  protected rawProviderCostUsd(): number {
    return 0;
  }

  async execute(
    input: ClaimSummaryInput,
    context: AiToolContext,
  ): Promise<ClaimSummary> {
    if (context.userId == null) {
      throw new AiToolError(
        'getClaimSummary requires an authenticated user',
        'permission_denied',
      );
    }
    const fromPage =
      context.pageContext?.entity === 'claim'
        ? context.pageContext?.entityId
        : undefined;
    const candidate = fromPage ?? input.claimId;
    const claimId = candidate != null ? Number(candidate) : NaN;
    if (!Number.isFinite(claimId) || claimId <= 0) {
      throw new AiToolError(
        'getClaimSummary requires a valid claimId',
        'invalid_input',
      );
    }

    const result = await this.summaries.getClaimForUser(
      context.userId,
      claimId,
      context.companyId ?? null,
    );

    if (context.companyId != null) {
      await this.billingConsumer.consumeOrTopup({
        companyId: context.companyId,
        rawCostUsd: this.rawProviderCostUsd(),
        aiRunId: context.aiRunId ?? null,
        toolCallId: context.idempotencyKey ?? null,
        idempotencyKey: buildToolIdempotencyKey(this.name, context),
        notes: `tool:${this.name}`,
      });
    }
    return result;
  }
}
