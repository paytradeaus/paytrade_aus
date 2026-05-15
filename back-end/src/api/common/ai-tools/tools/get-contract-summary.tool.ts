import { Injectable } from '@nestjs/common';
import { AiBillingConsumer } from '../../ai-billing/ai-billing-consumer.helper';
import { AiTool, AiToolContext, AiToolError } from '../ai-tool.interface';
import { objectSchema, passthroughSchema } from '../simple-schema';
import { buildToolIdempotencyKey } from './idempotency';
import {
  ContractSummary,
  RecordSummaryService,
} from '../services/record-summary.service';

interface ContractSummaryInput {
  contractId?: number;
}

/**
 * Read-only tool: fetch a brief summary of a contract the user is
 * currently viewing. Re-validates company membership via the domain
 * service.
 */
@Injectable()
export class GetContractSummaryTool
  implements AiTool<ContractSummaryInput, ContractSummary>
{
  name = 'getContractSummary';
  description =
    'Returns a read-only summary of a PayTrade contract (parties, amounts, dates, retention type, project). Use when the user is viewing or asking about a specific contract.';
  category = 'records';
  riskLevel = 'read' as const;
  reversible = true;
  inputSchema = objectSchema<ContractSummaryInput>({
    contractId: {
      type: 'integer',
      optional: true,
      description:
        'Contract id to look up. If omitted, the contract from the current page context is used.',
    },
  });
  outputSchema = passthroughSchema as any;

  constructor(
    private readonly summaries: RecordSummaryService,
    private readonly billingConsumer: AiBillingConsumer,
  ) {}

  protected rawProviderCostUsd(): number {
    return 0;
  }

  async execute(
    input: ContractSummaryInput,
    context: AiToolContext,
  ): Promise<ContractSummary> {
    if (context.userId == null) {
      throw new AiToolError(
        'getContractSummary requires an authenticated user',
        'permission_denied',
      );
    }
    const fromPage =
      context.pageContext?.entity === 'contract'
        ? context.pageContext?.entityId
        : undefined;
    const candidate = fromPage ?? input.contractId;
    const contractId = candidate != null ? Number(candidate) : NaN;
    if (!Number.isFinite(contractId) || contractId <= 0) {
      throw new AiToolError(
        'getContractSummary requires a valid contractId',
        'invalid_input',
      );
    }

    const result = await this.summaries.getContractForUser(
      context.userId,
      contractId,
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
