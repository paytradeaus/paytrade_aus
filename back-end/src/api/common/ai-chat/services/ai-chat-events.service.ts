import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'events';

/**
 * Push channel from the backend to a single user's open SSE
 * connections. Today the only event we emit is `navigation_request`
 * (from the `requestUserViewNavigation` tool); other lightweight
 * events (run summary updates, etc.) reuse the same pipe.
 *
 * The channel is intentionally in-memory and per-process. PayTrade
 * runs a single backend Node process per environment, so this is
 * sufficient. If we ever go horizontal we'll swap the EventEmitter
 * for Redis pub/sub.
 */
export type AiChatPushEvent =
  | {
      type: 'navigation_request';
      runId: string;
      route: string;
      reason?: string;
      requestedAt: string;
    }
  | {
      type: 'run_started';
      runId: string;
      conversationId: string;
      requestedAt: string;
    }
  | {
      type: 'run_completed';
      runId: string;
      status: 'completed' | 'stopped' | 'failed';
      amountChargedUsd: number;
      multiplier: number;
      totalTokens: number;
      requestedAt: string;
    };

@Injectable()
export class AiChatEventsService {
  private readonly emitter = new EventEmitter();

  constructor() {
    // Allow many concurrent SSE listeners per user without warnings.
    this.emitter.setMaxListeners(0);
  }

  private channel(userId: number) {
    return `user:${userId}`;
  }

  emit(userId: number, event: AiChatPushEvent): void {
    this.emitter.emit(this.channel(userId), event);
  }

  subscribe(
    userId: number,
    listener: (event: AiChatPushEvent) => void,
  ): () => void {
    const ch = this.channel(userId);
    this.emitter.on(ch, listener);
    return () => this.emitter.off(ch, listener);
  }
}
