import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserDetails } from 'src/entities/user-details.entity';
import {
  AiTool,
  AiToolContext,
  AiToolError,
} from '../../ai-tools/ai-tool.interface';
import { objectSchema } from '../../ai-tools/simple-schema';
import { AiChatEventsService } from '../services/ai-chat-events.service';

interface Input {
  route: string;
  reason?: string;
}

interface Output {
  delivered: boolean;
  route: string;
  reasonRecorded: string | null;
  followEnabled: boolean;
}

const ROUTE_RE = /^\/[a-zA-Z0-9_\-/?=&%.~:#]*$/;

/**
 * Live-follow navigation. Asks the *frontend* to take the user to a
 * given relative path. Gated server-side by
 * `user_details.ai_live_follow_enabled` so the model cannot hijack
 * navigation when the user has the toggle off.
 *
 * Emits a `navigation_request` push event over the user's SSE
 * channel; the frontend honours it and writes a breadcrumb. The
 * frontend MUST ignore the event when the user has the local
 * follow toggle off (defence in depth).
 */
@Injectable()
export class RequestUserViewNavigationTool
  implements AiTool<Input, Output>
{
  name = 'requestUserViewNavigation';
  description =
    'Asks the user-facing UI to navigate the user to a relative PayTrade route (e.g. "/user/payment-claims/123"). Requires the user to have AI live-follow enabled. Read-only side effect on the UI.';
  category = 'navigation';
  riskLevel = 'low' as const;
  reversible = true;

  inputSchema = objectSchema<Input>({
    route: {
      type: 'string',
      description: 'Relative URL beginning with "/" — e.g. "/user/payment-claims".',
    },
    reason: {
      type: 'string',
      optional: true,
      description: 'Short, user-visible reason for the navigation suggestion.',
    },
  });
  outputSchema = objectSchema<Output>({
    delivered: { type: 'boolean' },
    route: { type: 'string' },
    reasonRecorded: { type: 'string', optional: true },
    followEnabled: { type: 'boolean' },
  });

  constructor(
    private readonly events: AiChatEventsService,
    @InjectRepository(UserDetails)
    private readonly userRepo: Repository<UserDetails>,
  ) {}

  async execute(input: Input, ctx: AiToolContext): Promise<Output> {
    if (ctx.userId == null) {
      throw new AiToolError('Authentication required', 'permission_denied');
    }

    const route = (input.route || '').trim();
    if (!ROUTE_RE.test(route) || route.length > 500) {
      throw new AiToolError(
        'route must be a relative path beginning with "/".',
        'invalid_input',
      );
    }

    const user = await this.userRepo.findOne({
      where: { user_id: ctx.userId },
    });
    const followEnabled =
      !!user && (user as any).ai_live_follow_enabled === true;

    if (!followEnabled) {
      // Per spec — server refuses to emit if the user opted out.
      return {
        delivered: false,
        route,
        reasonRecorded: input.reason ?? null,
        followEnabled: false,
      };
    }

    this.events.emit(ctx.userId, {
      type: 'navigation_request',
      runId: ctx.aiRunId ?? '',
      route,
      reason: input.reason,
      requestedAt: new Date().toISOString(),
    });

    return {
      delivered: true,
      route,
      reasonRecorded: input.reason ?? null,
      followEnabled: true,
    };
  }
}
