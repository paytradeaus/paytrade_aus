import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { UserDetails } from 'src/entities/user-details.entity';
import { AiSupportService } from '../ai-support/ai-support.service';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';

const MAX_HISTORY = 50;

export interface ChatPageContext {
  route?: string;
  pageLabel?: string;
  entity?: string;
  entityId?: string;
  entityIds?: Record<string, string>;
  companyId?: number;
}

interface StoredMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  ts: string;
  status?: string;
  pageContext?: ChatPageContext;
}

@Injectable()
export class AiChatService {
  private logger = new PaytradeLogger('AI_CHAT');

  constructor(
    @InjectRepository(UserDetails)
    private readonly userDetails: Repository<UserDetails>,
    private readonly aiSupportService: AiSupportService,
  ) {}

  private async loadUser(userId: number): Promise<UserDetails> {
    const user = await this.userDetails.findOne({ where: { user_id: userId } });
    if (!user) throw new Error('User not found');
    return user;
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

  private readHistory(user: UserDetails): StoredMessage[] {
    const prefs: Record<string, any> = user.ui_preferences || {};
    const raw = Array.isArray(prefs.aiChat) ? prefs.aiChat : [];
    return raw
      .filter(
        (m: any) =>
          m && typeof m.content === 'string' && (m.role === 'user' || m.role === 'assistant'),
      )
      .map((m: any) => ({
        id: typeof m.id === 'string' ? m.id : randomUUID(),
        role: m.role,
        content: m.content,
        ts: typeof m.ts === 'string' ? m.ts : new Date().toISOString(),
        status: typeof m.status === 'string' ? m.status : undefined,
        pageContext: this.sanitisePageContext(m.pageContext),
      }));
  }

  private async writeHistory(user: UserDetails, history: StoredMessage[]) {
    const trimmed = history.slice(-MAX_HISTORY);
    const merged: Record<string, any> = { ...(user.ui_preferences || {}) };
    merged.aiChat = trimmed;
    user.ui_preferences = merged;
    user.updated_by = user.user_id;
    user.updated_on = new Date();
    user.updated_group = 'USER';
    await this.userDetails.save(user);
  }

  async getHistory(userId: number): Promise<StoredMessage[]> {
    const user = await this.loadUser(userId);
    return this.readHistory(user);
  }

  async clearHistory(userId: number): Promise<StoredMessage[]> {
    const user = await this.loadUser(userId);
    await this.writeHistory(user, []);
    return [];
  }

  async sendMessage(
    userId: number,
    rawMessage: string,
    rawPageContext?: ChatPageContext,
    onDelta?: (chunk: string) => void,
  ): Promise<{
    status: string;
    message?: string;
    history: StoredMessage[];
    remainingQuota?: number;
  }> {
    const text = (rawMessage || '').trim();
    if (!text) {
      return {
        status: 'ERROR',
        message: 'Please enter a message.',
        history: await this.getHistory(userId),
      };
    }

    const pageContext = this.sanitisePageContext(rawPageContext);
    const user = await this.loadUser(userId);
    const history = this.readHistory(user);

    const userMsg: StoredMessage = {
      id: randomUUID(),
      role: 'user',
      content: text.slice(0, 500),
      ts: new Date().toISOString(),
      pageContext,
    };
    history.push(userMsg);

    let answer: any;
    try {
      answer = await this.aiSupportService.askQuestion(
        userId,
        text,
        pageContext,
        onDelta,
      );
    } catch (err: any) {
      this.logger.error(`askQuestion failed for user=${userId}: ${err?.message}`);
      answer = {
        status: 'ERROR',
        answer: null,
        message: 'Something went wrong. Please try again later.',
        remainingQuota: 0,
      };
    }

    const assistantContent: string =
      (answer?.answer && String(answer.answer)) ||
      answer?.message ||
      'Sorry, I could not generate an answer.';

    const assistantMsg: StoredMessage = {
      id: randomUUID(),
      role: 'assistant',
      content: assistantContent,
      ts: new Date().toISOString(),
      status: answer?.status || 'SUCCESS',
    };
    history.push(assistantMsg);

    await this.writeHistory(user, history);

    return {
      status: answer?.status || 'SUCCESS',
      message: answer?.message || undefined,
      history: this.readHistory(await this.loadUser(userId)),
      remainingQuota:
        typeof answer?.remainingQuota === 'number' ? answer.remainingQuota : undefined,
    };
  }
}
