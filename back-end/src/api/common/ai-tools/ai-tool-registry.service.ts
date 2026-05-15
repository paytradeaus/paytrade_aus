import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiToolRegistry } from 'src/entities/ai-tool-registry.entity';
import { AiToolCall } from 'src/entities/ai-tool-call.entity';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import {
  AiTool,
  AiToolContext,
  AiToolError,
} from './ai-tool.interface';

/**
 * In-memory tool catalogue + single execution path that validates
 * input/output, honours scoped idempotency keys, and writes a row
 * in `ai_tool_calls` for every invocation (success, error, denied,
 * or replay). The DB row in `ai_tool_registry` is the durable
 * mirror; both are kept in sync by `register()`.
 */
@Injectable()
export class AiToolRegistryService {
  private readonly logger = new PaytradeLogger('AI_TOOL_REGISTRY');
  private readonly tools = new Map<string, AiTool>();

  constructor(
    @InjectRepository(AiToolRegistry)
    private readonly registryRepo: Repository<AiToolRegistry>,
    @InjectRepository(AiToolCall)
    private readonly callRepo: Repository<AiToolCall>,
  ) {}

  /**
   * Register a tool at boot. Idempotent: re-registering with the same
   * name updates the in-memory entry and refreshes the DB row.
   */
  async register(tool: AiTool): Promise<void> {
    if (!tool.name || !/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(tool.name)) {
      throw new Error(
        `[ai-tool-registry] Invalid tool name "${tool.name}" — must be alphanumeric/underscore/hyphen.`,
      );
    }
    this.tools.set(tool.name, tool);

    try {
      const existing = await this.registryRepo.findOne({
        where: { name: tool.name },
      });
      const payload: Partial<AiToolRegistry> = {
        name: tool.name,
        description: tool.description,
        category: tool.category ?? null,
        input_schema: tool.inputSchema?.jsonSchema ?? null,
        output_schema: tool.outputSchema?.jsonSchema ?? null,
        risk_level: tool.riskLevel,
        requires_approval: tool.requiresApproval ?? false,
        required_permissions: tool.requiredPermissions ?? null,
        reversible: tool.reversible ?? tool.riskLevel === 'read',
        revert_strategy: tool.revertStrategy ?? null,
        enabled: tool.enabled ?? true,
      };
      if (existing) {
        await this.registryRepo.update({ id: existing.id }, payload);
      } else {
        await this.registryRepo.insert(payload);
      }
    } catch (error) {
      // Registry persistence must not block boot — the in-memory
      // catalogue is still usable. Surface the error in logs so it
      // can be investigated.
      this.logger.error(
        `Failed to upsert ai_tool_registry row for "${tool.name}": ${error}`,
      );
    }
  }

  list(): AiTool[] {
    return Array.from(this.tools.values());
  }

  get(name: string): AiTool | undefined {
    return this.tools.get(name);
  }

  /**
   * Run a registered tool. Always logs the call, regardless of
   * outcome. Returns the (validated) output on success and re-throws
   * the original error on failure so callers can react.
   */
  async execute<O = any>(
    name: string,
    input: unknown,
    context: AiToolContext = {},
  ): Promise<O> {
    const startedAt = Date.now();
    const tool = this.tools.get(name);

    if (!tool) {
      await this.recordCall({
        toolName: name,
        input,
        output: null,
        status: 'error',
        errorCode: 'unknown_tool',
        errorMessage: `Unknown tool: ${name}`,
        duration: Date.now() - startedAt,
        context,
      });
      throw new AiToolError(`Unknown tool: ${name}`, 'unknown_tool');
    }

    if (tool.enabled === false) {
      await this.recordCall({
        toolName: name,
        input,
        output: null,
        status: 'denied',
        errorCode: 'tool_disabled',
        errorMessage: `Tool "${name}" is disabled`,
        duration: Date.now() - startedAt,
        context,
      });
      throw new AiToolError(`Tool "${name}" is disabled`, 'tool_disabled');
    }

    // Idempotency replay — scoped to (tool, user, company, key) so
    // reusing the same key across tools/users does not collide.
    if (context.idempotencyKey) {
      const previous = await this.callRepo.findOne({
        where: {
          tool_name: name,
          user_id: context.userId ?? null,
          company_id: context.companyId ?? null,
          idempotency_key: context.idempotencyKey,
          status: 'success',
        },
      });
      if (previous) {
        await this.recordCall({
          toolName: name,
          input,
          output: previous.output,
          status: 'replay',
          errorCode: null,
          errorMessage: null,
          duration: Date.now() - startedAt,
          context,
          replayOfCallId: previous.id,
        });
        return previous.output as O;
      }
    }

    let parsedInput: unknown;
    try {
      parsedInput = tool.inputSchema.parse(input ?? {});
    } catch (error) {
      const code =
        error instanceof AiToolError ? error.code : 'invalid_input';
      const message = error instanceof Error ? error.message : String(error);
      await this.recordCall({
        toolName: name,
        input,
        output: null,
        status: 'error',
        errorCode: code,
        errorMessage: message,
        duration: Date.now() - startedAt,
        context,
      });
      throw error instanceof AiToolError
        ? error
        : new AiToolError(message, 'invalid_input');
    }

    let output: O;
    try {
      output = (await tool.execute(parsedInput, context)) as O;
    } catch (error) {
      const code =
        error instanceof AiToolError ? error.code : 'internal_error';
      const message = error instanceof Error ? error.message : String(error);
      await this.recordCall({
        toolName: name,
        input: parsedInput,
        output: null,
        status: code === 'permission_denied' ? 'denied' : 'error',
        errorCode: code,
        errorMessage: message,
        duration: Date.now() - startedAt,
        context,
      });
      throw error;
    }

    let validatedOutput: O;
    try {
      validatedOutput = tool.outputSchema.parse(output) as O;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.recordCall({
        toolName: name,
        input: parsedInput,
        output,
        status: 'error',
        errorCode: 'invalid_output',
        errorMessage: message,
        duration: Date.now() - startedAt,
        context,
      });
      throw new AiToolError(message, 'invalid_output');
    }

    await this.recordCall({
      toolName: name,
      input: parsedInput,
      output: validatedOutput,
      status: 'success',
      errorCode: null,
      errorMessage: null,
      duration: Date.now() - startedAt,
      context,
    });

    return validatedOutput;
  }

  private async recordCall(opts: {
    toolName: string;
    input: unknown;
    output: unknown;
    status: 'success' | 'error' | 'denied' | 'replay';
    errorCode: string | null;
    errorMessage: string | null;
    duration: number;
    context: AiToolContext;
    replayOfCallId?: string | null;
  }): Promise<void> {
    try {
      await this.callRepo.insert({
        tool_name: opts.toolName,
        input: this.toJsonb(opts.input),
        output: this.toJsonb(opts.output),
        error_code: opts.errorCode,
        error_message: opts.errorMessage,
        status: opts.status,
        replay_of_call_id: opts.replayOfCallId ?? null,
        duration_ms: opts.duration,
        user_id: opts.context.userId ?? null,
        company_id: opts.context.companyId ?? null,
        admin_id: opts.context.adminId ?? null,
        ai_run_id: opts.context.aiRunId ?? null,
        idempotency_key: opts.context.idempotencyKey ?? null,
      });
    } catch (error) {
      this.logger.error(
        `Failed to write ai_tool_calls row for "${opts.toolName}": ${error}`,
      );
    }
  }

  private toJsonb(value: unknown): Record<string, any> | null {
    if (value === undefined || value === null) return null;
    if (typeof value === 'object' && !Array.isArray(value))
      return value as Record<string, any>;
    return { value } as Record<string, any>;
  }
}
