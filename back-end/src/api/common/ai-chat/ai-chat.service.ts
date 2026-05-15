import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserDetails } from 'src/entities/user-details.entity';
import { AiChatThread } from 'src/entities/ai-chat-thread.entity';
import { AiChatMessage } from 'src/entities/ai-chat-message.entity';
import { AiSupportService } from '../ai-support/ai-support.service';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';

const MESSAGE_INPUT_MAX = 500;
const TITLE_MAX = 200;

export interface ChatPageContext {
  route?: string;
  pageLabel?: string;
  entity?: string;
  entityId?: string;
  entityIds?: Record<string, string>;
  companyId?: number;
}

interface ChatMessageDto {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  ts: string;
  status?: string;
  errorReason?: string;
  pageContext?: ChatPageContext;
}

interface ChatThreadSummaryDto {
  id: string;
  title: string;
  messageCount: number;
  lastMessageAt?: string;
  createdAt: string;
}

@Injectable()
export class AiChatService {
  private logger = new PaytradeLogger('AI_CHAT');

  constructor(
    @InjectRepository(UserDetails)
    private readonly userDetails: Repository<UserDetails>,
    @InjectRepository(AiChatThread)
    private readonly threads: Repository<AiChatThread>,
    @InjectRepository(AiChatMessage)
    private readonly messages: Repository<AiChatMessage>,
    private readonly aiSupportService: AiSupportService,
  ) {}

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private toMessageDto(m: AiChatMessage): ChatMessageDto {
    return {
      id: m.id,
      role: m.role,
      content: m.content,
      ts: (m.created_on instanceof Date ? m.created_on : new Date(m.created_on))
        .toISOString(),
      status: m.status || undefined,
      errorReason: m.error_reason || undefined,
      pageContext: this.sanitisePageContext(m.page_context as ChatPageContext | undefined),
    };
  }

  private sanitisePageContext(
    raw: ChatPageContext | undefined,
  ): ChatPageContext | undefined {
    if (!raw || typeof raw !== 'object') return undefined;
    const trim = (v: unknown, max = 200): string | undefined => {
      if (typeof v !== 'string') return undefined;
      const t = v.trim();
      return t ? t.slice(0, max) : undefined;
    };
    const out: ChatPageContext = {};
    const route = trim(raw.route, 500);
    if (route) out.route = route;
    const pageLabel = trim(raw.pageLabel);
    if (pageLabel) out.pageLabel = pageLabel;
    const entity = trim(raw.entity, 80);
    if (entity) out.entity = entity;
    const entityId = trim(raw.entityId, 80);
    if (entityId) out.entityId = entityId;
    if (raw.entityIds && typeof raw.entityIds === 'object') {
      const ids: Record<string, string> = {};
      for (const [k, v] of Object.entries(raw.entityIds)) {
        const ck = trim(k, 60);
        const cv = trim(typeof v === 'number' ? String(v) : v, 80);
        if (ck && cv) ids[ck] = cv;
      }
      if (Object.keys(ids).length) out.entityIds = ids;
    }
    if (typeof raw.companyId === 'number' && Number.isFinite(raw.companyId)) {
      out.companyId = raw.companyId;
    }
    return Object.keys(out).length ? out : undefined;
  }

  private toThreadSummary(t: AiChatThread): ChatThreadSummaryDto {
    return {
      id: t.id,
      title: t.title,
      messageCount: t.message_count,
      lastMessageAt: t.last_message_at
        ? (t.last_message_at instanceof Date
            ? t.last_message_at
            : new Date(t.last_message_at)
          ).toISOString()
        : undefined,
      createdAt: (t.created_on instanceof Date
        ? t.created_on
        : new Date(t.created_on)
      ).toISOString(),
    };
  }

  /** Derive a short title from the user's first message. */
  private deriveTitle(rawText: string): string {
    const cleaned = (rawText || '').replace(/\s+/g, ' ').trim();
    if (!cleaned) return 'New chat';
    const firstSentence = cleaned.split(/(?<=[.?!])\s/)[0] || cleaned;
    const candidate = firstSentence.length > 60
      ? `${firstSentence.slice(0, 57).trimEnd()}…`
      : firstSentence;
    return candidate.slice(0, TITLE_MAX);
  }

  /** Look up a thread + verify it belongs to the requesting user. */
  private async loadOwnedThread(
    userId: number,
    threadId: string,
  ): Promise<AiChatThread | null> {
    if (!threadId) return null;
    const thread = await this.threads.findOne({ where: { id: threadId } });
    if (!thread || thread.user_id !== userId) return null;
    return thread;
  }

  /**
   * One-time lazy migration of the legacy single-bucket `ui_preferences.aiChat`
   * history into a dedicated thread, so existing users don't appear to lose
   * their conversation when threads ship.
   */
  private async migrateLegacyHistoryIfNeeded(userId: number): Promise<void> {
    const existing = await this.threads.count({ where: { user_id: userId } });
    if (existing > 0) return;

    const user = await this.userDetails.findOne({ where: { user_id: userId } });
    if (!user) return;
    const prefs: Record<string, any> = user.ui_preferences || {};
    const raw = Array.isArray(prefs.aiChat) ? prefs.aiChat : [];
    const valid = raw.filter(
      (m: any) =>
        m && typeof m.content === 'string' && (m.role === 'user' || m.role === 'assistant'),
    );
    if (valid.length === 0) return;

    const firstUser = valid.find((m: any) => m.role === 'user');
    const title = this.deriveTitle(firstUser?.content || 'Previous chat');

    const thread = await this.threads.save(
      this.threads.create({
        user_id: userId,
        company_id: null,
        title,
        message_count: valid.length,
      }),
    );

    let lastTs: Date | null = null;
    for (const m of valid) {
      let ts: Date;
      if (typeof m.ts === 'string' && m.ts) {
        const parsed = new Date(m.ts);
        ts = isNaN(parsed.getTime()) ? new Date() : parsed;
      } else {
        ts = new Date();
      }
      const saved = await this.messages.save(
        this.messages.create({
          thread_id: thread.id,
          role: m.role,
          content: String(m.content),
          status: typeof m.status === 'string' ? m.status : null,
          page_context: this.sanitisePageContext(m.pageContext) || null,
        }),
      );
      // Preserve original timestamp ordering for display.
      const updateData: Partial<AiChatMessage> = { created_on: ts };
      await this.messages.update({ id: saved.id }, updateData);
      lastTs = ts;
    }
    if (lastTs) {
      await this.threads.update({ id: thread.id }, { last_message_at: lastTs });
    }

    // Clear the legacy bucket so we don't migrate twice on the next call.
    const merged: Record<string, any> = { ...(user.ui_preferences || {}) };
    delete merged.aiChat;
    user.ui_preferences = merged;
    user.updated_by = user.user_id;
    user.updated_on = new Date();
    user.updated_group = 'USER';
    await this.userDetails.save(user);
  }

  // ---------------------------------------------------------------------------
  // Thread operations
  // ---------------------------------------------------------------------------

  async listThreads(userId: number): Promise<ChatThreadSummaryDto[]> {
    await this.migrateLegacyHistoryIfNeeded(userId);
    const rows = await this.threads.find({
      where: { user_id: userId },
      order: { last_message_at: 'DESC', created_on: 'DESC' },
      take: 100,
    });
    return rows.map((r) => this.toThreadSummary(r));
  }

  async createThread(userId: number, title?: string): Promise<ChatThreadSummaryDto> {
    const cleaned = (title || '').trim().slice(0, TITLE_MAX);
    const t = await this.threads.save(
      this.threads.create({
        user_id: userId,
        company_id: null,
        title: cleaned || 'New chat',
        message_count: 0,
      }),
    );
    return this.toThreadSummary(t);
  }

  async renameThread(
    userId: number,
    threadId: string,
    title: string,
  ): Promise<ChatThreadSummaryDto | null> {
    const thread = await this.loadOwnedThread(userId, threadId);
    if (!thread) return null;
    const cleaned = (title || '').trim().slice(0, TITLE_MAX);
    thread.title = cleaned || 'New chat';
    const saved = await this.threads.save(thread);
    return this.toThreadSummary(saved);
  }

  async deleteThread(userId: number, threadId: string): Promise<boolean> {
    const thread = await this.loadOwnedThread(userId, threadId);
    if (!thread) return false;
    await this.messages.delete({ thread_id: thread.id });
    await this.threads.delete({ id: thread.id });
    return true;
  }

  async getThreadMessages(
    userId: number,
    threadId: string,
  ): Promise<{ thread: ChatThreadSummaryDto; messages: ChatMessageDto[] } | null> {
    const thread = await this.loadOwnedThread(userId, threadId);
    if (!thread) return null;
    const rows = await this.messages.find({
      where: { thread_id: thread.id },
      order: { created_on: 'ASC' },
    });
    return {
      thread: this.toThreadSummary(thread),
      messages: rows.map((r) => this.toMessageDto(r)),
    };
  }

  // ---------------------------------------------------------------------------
  // Send a message into a thread (creating one on the fly if needed).
  // ---------------------------------------------------------------------------

  async sendMessage(
    userId: number,
    rawMessage: string,
    threadId?: string | null,
    rawPageContext?: ChatPageContext,
    onDelta?: (chunk: string) => void,
    abortSignal?: AbortSignal,
  ): Promise<{
    status: string;
    message?: string;
    thread?: ChatThreadSummaryDto;
    history: ChatMessageDto[];
    remainingQuota?: number;
  }> {
    const text = (rawMessage || '').trim();
    if (!text) {
      return {
        status: 'ERROR',
        message: 'Please enter a message.',
        history: [],
      };
    }

    const pageContext = this.sanitisePageContext(rawPageContext);

    await this.migrateLegacyHistoryIfNeeded(userId);

    // Resolve the target thread.
    let thread: AiChatThread | null = null;
    if (threadId) {
      thread = await this.loadOwnedThread(userId, threadId);
      if (!thread) {
        return {
          status: 'ERROR',
          message: 'That conversation could not be found.',
          history: [],
        };
      }
    }
    const isNewThread = !thread;
    if (!thread) {
      thread = await this.threads.save(
        this.threads.create({
          user_id: userId,
          company_id: null,
          title: this.deriveTitle(text),
          message_count: 0,
        }),
      );
    }

    const trimmedInput = text.slice(0, MESSAGE_INPUT_MAX);

    // Persist user message (with pageContext attached).
    await this.messages.save(
      this.messages.create({
        thread_id: thread.id,
        role: 'user',
        content: trimmedInput,
        status: null,
        page_context: pageContext || null,
      }),
    );

    // Call the support service.
    let answer: any;
    try {
      answer = await this.aiSupportService.askQuestion(
        userId,
        trimmedInput,
        pageContext,
        onDelta,
        abortSignal,
      );
    } catch (err: any) {
      this.logger.error(`askQuestion failed for user=${userId}: ${err?.message}`);
      answer = {
        status: 'ERROR',
        answer: null,
        message: 'Something went wrong. Please try again later.',
        errorReason:
          'Internal error while contacting the AI service. Please try again shortly.',
        remainingQuota: 0,
      };
    }

    const assistantContent: string =
      (answer?.answer && String(answer.answer)) ||
      answer?.message ||
      'Sorry, I could not generate an answer.';
    const assistantStatus: string = answer?.status || 'SUCCESS';
    const assistantErrorReason: string | null =
      assistantStatus !== 'SUCCESS' && typeof answer?.errorReason === 'string'
        ? answer.errorReason.slice(0, 240)
        : null;

    const assistantMsg = await this.messages.save(
      this.messages.create({
        thread_id: thread.id,
        role: 'assistant',
        content: assistantContent,
        status: assistantStatus,
        error_reason: assistantErrorReason,
      }),
    );

    // Update thread metadata. Auto-title if this was a brand-new thread or
    // the title is still the placeholder.
    const updates: Partial<AiChatThread> = {
      message_count: (thread.message_count || 0) + 2,
      last_message_at: assistantMsg.created_on,
    };
    if (isNewThread || !thread.title || thread.title === 'New chat') {
      updates.title = this.deriveTitle(trimmedInput);
    }
    await this.threads.update({ id: thread.id }, updates);
    Object.assign(thread, updates);

    const allMessages = await this.messages.find({
      where: { thread_id: thread.id },
      order: { created_on: 'ASC' },
    });

    return {
      status: assistantStatus,
      message: answer?.message || undefined,
      thread: this.toThreadSummary(thread),
      history: allMessages.map((m) => this.toMessageDto(m)),
      remainingQuota:
        typeof answer?.remainingQuota === 'number' ? answer.remainingQuota : undefined,
    };
  }

  // ---------------------------------------------------------------------------
  // Back-compat shims for the original single-bucket API.
  // ---------------------------------------------------------------------------

  /** @deprecated Returns the most recent thread's messages. */
  async getHistory(userId: number): Promise<ChatMessageDto[]> {
    await this.migrateLegacyHistoryIfNeeded(userId);
    const latest = await this.threads.findOne({
      where: { user_id: userId },
      order: { last_message_at: 'DESC', created_on: 'DESC' },
    });
    if (!latest) return [];
    const rows = await this.messages.find({
      where: { thread_id: latest.id },
      order: { created_on: 'ASC' },
    });
    return rows.map((r) => this.toMessageDto(r));
  }

  /** @deprecated Deletes the most recent thread (if any). */
  async clearHistory(userId: number): Promise<ChatMessageDto[]> {
    const latest = await this.threads.findOne({
      where: { user_id: userId },
      order: { last_message_at: 'DESC', created_on: 'DESC' },
    });
    if (latest) {
      await this.messages.delete({ thread_id: latest.id });
      await this.threads.delete({ id: latest.id });
    }
    return [];
  }
}
