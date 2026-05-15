import { AiToolContext } from '../ai-tool.interface';

/**
 * Build a per-call idempotency key for AI billing. When `aiRunId` or
 * `idempotencyKey` is present we use them so retries of the same model
 * turn debit the balance only once. When neither is present we
 * deliberately return `null` so two unrelated calls do not collapse
 * into a single charge under a constant fallback string.
 */
export function buildToolIdempotencyKey(
  toolName: string,
  context: AiToolContext,
): string | null {
  const run = context.aiRunId ?? null;
  const key = context.idempotencyKey ?? null;
  if (!run && !key) return null;
  return `${run ?? ''}:${toolName}:${key ?? ''}`;
}
