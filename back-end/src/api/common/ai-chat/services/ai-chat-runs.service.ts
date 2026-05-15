import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiConversation } from 'src/entities/ai-conversation.entity';
import { AiConversationMessage } from 'src/entities/ai-conversation-message.entity';
import { AiRun, AiRunStatus } from 'src/entities/ai-run.entity';

const TITLE_MAX = 200;

export interface ConversationSummary {
  id: string;
  title: string;
  lastMessageAt: string | null;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChatPageContext {
  path?: string;
  route?: string;
  pageLabel?: string;
  entity?: string;
  entityId?: string | number;
  entityIds?: Record<string, string>;
  companyId?: number;
}

export interface PersistedConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  ts: string;
  status?: string | null;
  pageContext?: ChatPageContext | null;
  runId?: string | null;
}

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
    @InjectRepository(AiConversationMessage)
    private readonly messageRepo: Repository<AiConversationMessage>,
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
      if (existing) {
        // If the conversation was originally bound to a company, the
        // current request must be for that same company. The caller is
        // responsible for verifying the requested company is one the
        // user currently has access to (via assertCompanyAccess on the
        // request body's companyId), so a matching company_id implies
        // the user still has profile access to this conversation.
        if (
          existing.company_id != null &&
          opts.companyId != null &&
          Number(existing.company_id) !== Number(opts.companyId)
        ) {
          throw new ForbiddenException(
            'Access denied: conversation belongs to a different business profile.',
          );
        }
        return existing;
      }
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

  async appendMessage(opts: {
    conversationId: string;
    runId?: string | null;
    role: 'user' | 'assistant';
    content: string;
    status?: string | null;
    pageContext?: ChatPageContext | null;
  }): Promise<AiConversationMessage> {
    const trimmed = (opts.content || '').slice(0, 100_000);
    const saved = await this.messageRepo.save(
      this.messageRepo.create({
        conversation_id: opts.conversationId,
        run_id: opts.runId ?? null,
        role: opts.role,
        content: trimmed,
        status: opts.status ?? null,
        page_context: opts.pageContext ?? null,
      }),
    );
    // Touch the conversation so it sorts to the top of the list.
    // Title is set lazily from the first user message when missing.
    const conv = await this.conversationRepo.findOne({
      where: { id: opts.conversationId },
    });
    if (conv) {
      const patch: Partial<AiConversation> = { updated_on: new Date() };
      if (!conv.title && opts.role === 'user') {
        patch.title = this.deriveTitle(trimmed);
      }
      await this.conversationRepo.update({ id: conv.id }, patch);
    }
    return saved;
  }

  private deriveTitle(text: string): string {
    const firstLine = (text || '').split('\n')[0].trim();
    if (!firstLine) return 'New chat';
    return firstLine.length > 60
      ? `${firstLine.slice(0, 57)}…`
      : firstLine;
  }

  /**
   * List the calling user's conversations, optionally scoped to a
   * specific business profile. Uses a single aggregated query so we
   * can return message counts + last-message timestamp without an
   * N+1 lookup.
   */
  async listConversationsForUser(
    userId: number,
    companyId?: number | null,
    limit = 50,
    allowedCompanyIds?: number[] | null,
  ): Promise<ConversationSummary[]> {
    const qb = this.conversationRepo
      .createQueryBuilder('c')
      .leftJoin(
        'ai_conversation_messages',
        'm',
        'm.conversation_id = c.id',
      )
      .where('c.user_id = :userId', { userId });
    if (companyId != null) {
      qb.andWhere('c.company_id = :companyId', { companyId });
    } else if (allowedCompanyIds) {
      // Restrict to business profiles the caller currently has access
      // to. Conversations with NULL company_id (legacy / unscoped)
      // remain visible to their owner. Pass an empty array to deny
      // all company-scoped conversations.
      if (allowedCompanyIds.length === 0) {
        qb.andWhere('c.company_id IS NULL');
      } else {
        qb.andWhere(
          '(c.company_id IS NULL OR c.company_id IN (:...allowedCompanyIds))',
          { allowedCompanyIds },
        );
      }
    }
    qb.select('c.id', 'id')
      .addSelect('c.title', 'title')
      .addSelect('c.created_on', 'created_on')
      .addSelect('c.updated_on', 'updated_on')
      .addSelect('COUNT(m.id)', 'message_count')
      .addSelect('MAX(m.created_on)', 'last_message_at')
      .groupBy('c.id')
      .having('COUNT(m.id) > 0')
      .orderBy('GREATEST(MAX(m.created_on), c.updated_on)', 'DESC')
      .limit(Math.max(1, Math.min(limit, 200)));
    const rows = await qb.getRawMany<{
      id: string;
      title: string | null;
      created_on: Date | string;
      updated_on: Date | string;
      message_count: string;
      last_message_at: Date | string | null;
    }>();
    return rows.map((r) => {
      const created = r.created_on instanceof Date ? r.created_on : new Date(r.created_on);
      const updated = r.updated_on instanceof Date ? r.updated_on : new Date(r.updated_on);
      const lastMsg = r.last_message_at
        ? r.last_message_at instanceof Date
          ? r.last_message_at
          : new Date(r.last_message_at)
        : null;
      return {
        id: r.id,
        title: r.title || 'New chat',
        lastMessageAt: lastMsg ? lastMsg.toISOString() : null,
        messageCount: Number(r.message_count) || 0,
        createdAt: created.toISOString(),
        updatedAt: updated.toISOString(),
      } satisfies ConversationSummary;
    });
  }

  async findConversationForUser(
    conversationId: string,
    userId: number,
  ): Promise<AiConversation | null> {
    return this.conversationRepo.findOne({
      where: { id: conversationId, user_id: userId },
    });
  }

  async getConversationMessages(
    conversationId: string,
  ): Promise<PersistedConversationMessage[]> {
    const rows = await this.messageRepo.find({
      where: { conversation_id: conversationId },
      order: { created_on: 'ASC' },
    });
    return rows.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      ts: (m.created_on instanceof Date
        ? m.created_on
        : new Date(m.created_on)
      ).toISOString(),
      status: m.status,
      pageContext: (m.page_context as ChatPageContext | null) ?? null,
      runId: m.run_id,
    }));
  }

  async renameConversation(
    conversationId: string,
    userId: number,
    title: string,
  ): Promise<AiConversation | null> {
    const conv = await this.findConversationForUser(conversationId, userId);
    if (!conv) return null;
    const cleaned = (title || '').trim().slice(0, TITLE_MAX) || 'New chat';
    await this.conversationRepo.update(
      { id: conv.id },
      { title: cleaned, updated_on: new Date() },
    );
    return this.conversationRepo.findOne({ where: { id: conv.id } });
  }

  async deleteConversation(
    conversationId: string,
    userId: number,
  ): Promise<boolean> {
    const conv = await this.findConversationForUser(conversationId, userId);
    if (!conv) return false;
    await this.messageRepo.delete({ conversation_id: conv.id });
    // Detach runs so the run/audit history survives but is no longer
    // tied to a conversation the user has chosen to forget.
    await this.runRepo.update(
      { conversation_id: conv.id },
      { conversation_id: null },
    );
    await this.conversationRepo.delete({ id: conv.id });
    return true;
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
