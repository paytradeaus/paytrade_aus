import { Injectable } from '@nestjs/common';
import { AiBillingConsumer } from '../../ai-billing/ai-billing-consumer.helper';
import { AiTool, AiToolContext, AiToolError } from '../ai-tool.interface';
import { objectSchema } from '../simple-schema';
import { buildToolIdempotencyKey } from './idempotency';
import {
  SystemStatusService,
  SystemStatusSnapshot,
} from '../services/system-status.service';

interface SnapshotInput {
  companyId?: number;
}

/** Read-only example tool. Wraps SystemStatusService; server-side companyId wins. */
@Injectable()
export class GetSystemStatusSnapshotTool
  implements AiTool<SnapshotInput, SystemStatusSnapshot>
{
  name = 'getSystemStatusSnapshot';
  description =
    'Returns a snapshot of the current state of the calling user and their active business profile.';
  category = 'observability';
  riskLevel = 'read' as const;
  reversible = true;
  inputSchema = objectSchema<SnapshotInput>({
    companyId: {
      type: 'integer',
      optional: true,
      description:
        'Optional business profile id. Server-side context wins when present.',
    },
  });
  outputSchema = objectSchema<SystemStatusSnapshot>({
    generatedAt: { type: 'string' },
    scope: { type: 'object' },
    company: { type: 'object', optional: true },
    membership: { type: 'object' },
  });

  constructor(
    private readonly statusService: SystemStatusService,
    private readonly billingConsumer: AiBillingConsumer,
  ) {}

  /**
   * Read-only tool: no AI provider call, so the raw cost is $0. Wired
   * through the billing consumer anyway so every tool exercises the
   * same charge path (Task #167).
   */
  protected rawProviderCostUsd(
    _input: SnapshotInput,
    _output: SystemStatusSnapshot,
  ): number {
    return 0;
  }

  async execute(
    input: SnapshotInput,
    context: AiToolContext,
  ): Promise<SystemStatusSnapshot> {
    if (context.userId == null) {
      throw new AiToolError(
        'getSystemStatusSnapshot requires an authenticated user',
        'permission_denied',
      );
    }
    // Server-side context always wins. The model-supplied id is a
    // fallback / hint only — the wrapped domain service still
    // re-validates membership.
    const companyId = context.companyId ?? input.companyId ?? null;
    const result = await this.statusService.getSnapshotForUser(
      context.userId,
      companyId,
    );
    if (companyId != null) {
      await this.billingConsumer.consumeOrTopup({
        companyId,
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
