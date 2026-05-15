import { Injectable } from '@nestjs/common';
import { AiBillingConsumer } from '../../ai-billing/ai-billing-consumer.helper';
import { AiTool, AiToolContext } from '../ai-tool.interface';
import { objectSchema } from '../simple-schema';
import { buildToolIdempotencyKey } from './idempotency';
import {
  PageContext,
  PageContextService,
} from '../services/page-context.service';

interface PageContextInput {
  // Intentionally empty: page context comes from `AiToolContext`,
  // not from the model. Listed here so the registry persists a
  // self-documenting empty input schema.
}

/** Read-only example tool. Page context comes from AiToolContext, never from model input. */
@Injectable()
export class GetCurrentPageContextTool
  implements AiTool<PageContextInput, PageContext>
{
  name = 'getCurrentPageContext';
  description =
    'Returns the path/entity/entityId of the page the user is currently viewing.';
  category = 'observability';
  riskLevel = 'read' as const;
  reversible = true;
  inputSchema = objectSchema<PageContextInput>({});
  outputSchema = objectSchema<PageContext>({
    path: { type: 'string', optional: true },
    entity: { type: 'string', optional: true },
    entityId: { type: 'string', optional: true },
    resolvedAt: { type: 'string' },
  });

  constructor(
    private readonly pageContextService: PageContextService,
    private readonly billingConsumer: AiBillingConsumer,
  ) {}

  /**
   * Read-only tool: no AI provider call, so the raw cost is $0. Wired
   * through the billing consumer anyway so every tool exercises the
   * same charge path (Task #167).
   */
  protected rawProviderCostUsd(
    _input: PageContextInput,
    _output: PageContext,
  ): number {
    return 0;
  }

  async execute(
    input: PageContextInput,
    context: AiToolContext,
  ): Promise<PageContext> {
    const result = await this.pageContextService.resolve(context.pageContext);
    if (context.companyId != null) {
      await this.billingConsumer.consumeOrTopup({
        companyId: context.companyId,
        rawCostUsd: this.rawProviderCostUsd(input, result),
        aiRunId: context.aiRunId ?? null,
        toolCallId: context.idempotencyKey ?? null,
        idempotencyKey: buildToolIdempotencyKey(this.name, context),
        notes: `tool:${this.name}`,
      });
    }
    return result;
  }
}
