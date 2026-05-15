import {
  AiToolRiskLevel,
} from 'src/entities/ai-tool-registry.entity';

/**
 * Schema contract for AI tools. `jsonSchema` is persisted in the
 * registry and surfaced to the model; `parse(value)` is the runtime
 * validator. See `simple-schema.ts` for a zero-dep helper; tools may
 * substitute zod/class-validator as long as they expose `parse`.
 */
export interface AiToolSchema<T = any> {
  jsonSchema: Record<string, any>;
  parse(value: unknown): T;
}

/**
 * Trusted execution context. `userId`/`companyId`/`adminId` come from
 * the JWT, never from model-supplied input — tools must use these
 * for permission checks.
 */
export interface AiToolContext {
  userId?: number | null;
  companyId?: number | null;
  adminId?: number | null;
  aiRunId?: string | null;
  idempotencyKey?: string | null;
  /** Optional path/route the user was on when the AI invoked the tool. */
  pageContext?: { path?: string; entity?: string; entityId?: string | number };
}

export interface AiTool<I = any, O = any> {
  /** Unique kebab-case identifier, e.g. `get-business-profile-summary`. */
  name: string;
  description: string;
  category?: string;
  inputSchema: AiToolSchema<I>;
  outputSchema: AiToolSchema<O>;
  riskLevel: AiToolRiskLevel;
  requiresApproval?: boolean;
  requiredPermissions?: string[];
  /** Whether the tool can be reverted. Read tools are trivially reversible. */
  reversible?: boolean;
  revertStrategy?: string | null;
  enabled?: boolean;
  /** Must delegate to a real domain service. No raw DB queries inside tools. */
  execute(input: I, context: AiToolContext): Promise<O>;
}

/** Structured error so the registry records a clean `error_code`. */
export class AiToolError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'invalid_input'
      | 'invalid_output'
      | 'permission_denied'
      | 'not_found'
      | 'unknown_tool'
      | 'tool_disabled'
      | 'out_of_credits'
      | 'internal_error' = 'internal_error',
  ) {
    super(message);
    this.name = 'AiToolError';
  }
}
