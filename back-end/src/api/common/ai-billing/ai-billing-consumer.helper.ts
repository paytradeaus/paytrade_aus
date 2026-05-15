import { Injectable } from '@nestjs/common';

import { PaytradeLogger } from 'src/libs/@loggers/logger.service';

import { AiToolError } from '../ai-tools/ai-tool.interface';

import {
  AiBillingService,
  ConsumeCreditInput,
  ConsumeCreditResult,
} from './ai-billing.service';

export interface ConsumeOrTopupInput extends ConsumeCreditInput {
  /**
   * Whether the company's Stripe interactions should be routed through
   * the sandbox keys (matches `ai_billing_settings.is_sandbox`).
   * When omitted the helper resolves the value from the persisted
   * `ai_billing_settings.is_sandbox`, so callers don't need to know
   * the company's mode.
   */
  isSandbox?: boolean;
}

/**
 * Thrown when a tool cannot proceed because the company has no remaining
 * AI credits and an auto top-up is either disabled, capped out, or
 * failed at Stripe. Extends `AiToolError` with code `out_of_credits`
 * so the AI Tool Registry records it with the correct error code and
 * the UI can render a deterministic, actionable message instead of a
 * generic `internal_error`.
 */
export class OutOfCreditsError extends AiToolError {
  constructor(
    public readonly balanceUsd: number,
    public readonly requiredUsd: number,
    message?: string,
  ) {
    super(
      message ??
        `AI credit balance ($${balanceUsd.toFixed(2)}) is insufficient ` +
          `for this request ($${requiredUsd.toFixed(2)}). ` +
          `Top up to continue.`,
      'out_of_credits',
    );
    this.name = 'OutOfCreditsError';
  }
}

/**
 * Task #167 — small wrapper around `AiBillingService` that packages the
 * "consume → on insufficient, evaluate auto-top-up → charge → retry"
 * pattern so every AI tool wrapper does not have to reimplement it.
 *
 * Usage from inside an AiTool:
 *
 * ```ts
 * await this.consumer.consumeOrTopup({
 *   companyId: context.companyId!,
 *   rawCostUsd: providerCostUsd,
 *   aiRunId: context.aiRunId,
 *   toolCallId: context.idempotencyKey ?? this.name,
 *   idempotencyKey: `${context.aiRunId ?? ''}:${context.idempotencyKey ?? this.name}`,
 * });
 * ```
 */
@Injectable()
export class AiBillingConsumer {
  private readonly logger = new PaytradeLogger('AI_BILLING_CONSUMER');

  constructor(private readonly billing: AiBillingService) {}

  /**
   * Charge `rawCostUsd` to the company's AI credit balance. When the
   * balance is too low, attempts a single auto-top-up (when settings
   * allow) and retries. Throws `OutOfCreditsError` when the company
   * cannot pay for the request.
   *
   * `rawCostUsd === 0` is a no-op that still resolves so call sites can
   * be wired uniformly across tools that have no provider cost yet.
   */
  async consumeOrTopup(
    input: ConsumeOrTopupInput,
  ): Promise<ConsumeCreditResult> {
    if (!input.companyId) {
      throw new Error('consumeOrTopup requires a companyId');
    }
    if (!Number.isFinite(input.rawCostUsd) || input.rawCostUsd < 0) {
      throw new Error('consumeOrTopup requires a non-negative rawCostUsd');
    }

    const first = await this.billing.consumeCredit(input);
    if (first.ok) return first;

    const auto = await this.billing.evaluateAutoTopup(input.companyId);
    if (!auto) {
      throw new OutOfCreditsError(first.balanceUsd, first.required, first.message);
    }

    // Resolve sandbox mode from persisted settings when the caller did not
    // pass one — tool wrappers don't know whether a company is in
    // sandbox/live, but `ai_billing_settings.is_sandbox` always does.
    let isSandbox = input.isSandbox;
    if (isSandbox === undefined) {
      try {
        const settings = await this.billing.getSettings(input.companyId);
        isSandbox = !!settings.is_sandbox;
      } catch (err) {
        this.logger.error(
          `Could not resolve sandbox mode for company ${input.companyId}: ${err}`,
        );
        isSandbox = false;
      }
    }

    try {
      await this.billing.chargeTopup({
        companyId: input.companyId,
        creditsUsd: auto.amountUsd,
        trigger: 'auto_topup',
        isSandbox,
      });
    } catch (err) {
      this.logger.error(
        `Auto top-up failed for company ${input.companyId}: ${err}`,
      );
      throw new OutOfCreditsError(
        first.balanceUsd,
        first.required,
        `AI credit balance ($${first.balanceUsd.toFixed(2)}) is insufficient ` +
          `for this request ($${first.required.toFixed(2)}) and the automatic ` +
          `top-up could not complete. Please top up manually to continue.`,
      );
    }

    const retry = await this.billing.consumeCredit(input);
    if (retry.ok) return retry;

    // Top-up succeeded yet the second consume still failed (e.g. cap hit
    // mid-flight, or the credited amount was less than required). Treat
    // as out-of-credits so the UI surfaces a clean message.
    throw new OutOfCreditsError(retry.balanceUsd, retry.required, retry.message);
  }
}
