import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiConversation } from 'src/entities/ai-conversation.entity';
import { AiRun, AiRunStatus } from 'src/entities/ai-run.entity';

export interface RunSummary {
  id: string;
  conversationId: string;
  status: AiRunStatus;
  amountChargedUsd: number;
  multiplier: number;
  rawCostUsd: number;
  totalTokens: number;
  toolCallCount: number;
  durationMs: number | null;
  model: string | null;
  startedAt: string;
  endedAt: string | null;
}

/**
 * Lifecycle of `ai_runs` + `ai_conversations`. Held in its own
 * service so the orchestrator can stay focused on the streaming
 * loop, and so external callers (admin UI, future debug tools) can
 * read run summaries.
 */
@Injectable()
export class AiChatRunsService {
  /** Tracks abort controllers so the stop endpoint can cancel an in-flight run. */
  private readonly abortControllers = new Map<string, AbortController>();

  constructor(
    @InjectRepository(AiConversation)
    private readonly conversationRepo: Repository<AiConversation>,
    @InjectRepository(AiRun)
    private readonly runRepo: Repository<AiRun>,
  ) {}

  async ensureConversation(opts: {
    conversationId?: string | null;
    userId: number;
    companyId?: number | null;
  }): Promise<AiConversation> {
    if (opts.conversationId) {
      const existing = await this.conversationRepo.findOne({
        where: { id: opts.conversationId, user_id: opts.userId },
      });
      if (existing) return existing;
    }
    return this.conversationRepo.save(
      this.conversationRepo.create({
        user_id: opts.userId,
        company_id: opts.companyId ?? null,
        title: null,
      }),
    );
  }

  async startRun(opts: {
    conversationId: string;
    userId: number;
    companyId?: number | null;
    model: string;
  }): Promise<AiRun> {
    const run = this.runRepo.create({
      conversation_id: opts.conversationId,
      user_id: opts.userId,
      company_id: opts.companyId ?? null,
      status: 'running' as AiRunStatus,
      model: opts.model,
      started_at: new Date(),
    });
    return this.runRepo.save(run);
  }

  registerAbortController(runId: string, controller: AbortController): void {
    this.abortControllers.set(runId, controller);
  }

  releaseAbortController(runId: string): void {
    this.abortControllers.delete(runId);
  }

  /** Returns true if a controller existed and was signalled. */
  abort(runId: string): boolean {
    const controller = this.abortControllers.get(runId);
    if (!controller) return false;
    controller.abort();
    return true;
  }

  async finishRun(
    runId: string,
    patch: {
      status: AiRunStatus;
      openaiResponseId?: string | null;
      rawCostUsd?: number;
      amountChargedUsd?: number;
      promptTokens?: number;
      completionTokens?: number;
      totalTokens?: number;
      toolCallCount?: number;
      durationMs?: number;
      errorMessage?: string | null;
    },
  ): Promise<void> {
    await this.runRepo.update(
      { id: runId },
      {
        status: patch.status,
        openai_response_id: patch.openaiResponseId ?? null,
        raw_cost_usd: (patch.rawCostUsd ?? 0).toFixed(6),
        amount_charged_usd: (patch.amountChargedUsd ?? 0).toFixed(4),
        prompt_tokens: patch.promptTokens ?? 0,
        completion_tokens: patch.completionTokens ?? 0,
        total_tokens: patch.totalTokens ?? 0,
        tool_call_count: patch.toolCallCount ?? 0,
        duration_ms: patch.durationMs ?? null,
        error_message: patch.errorMessage ?? null,
        ended_at: new Date(),
      },
    );
  }

  /** Verifies caller-vs-run ownership before stop / read operations. */
  async findRunForUser(
    runId: string,
    userId: number,
  ): Promise<AiRun | null> {
    return this.runRepo.findOne({
      where: { id: runId, user_id: userId },
    });
  }

  toSummary(run: AiRun, multiplier: number): RunSummary {
    return {
      id: run.id,
      conversationId: run.conversation_id ?? '',
      status: run.status,
      amountChargedUsd: Number(run.amount_charged_usd) || 0,
      multiplier,
      rawCostUsd: Number(run.raw_cost_usd) || 0,
      totalTokens: run.total_tokens || 0,
      toolCallCount: run.tool_call_count || 0,
      durationMs: run.duration_ms,
      model: run.model,
      startedAt: run.started_at?.toISOString?.() ?? new Date().toISOString(),
      endedAt: run.ended_at ? run.ended_at.toISOString() : null,
    };
  }
}
