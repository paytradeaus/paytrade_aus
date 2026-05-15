import {
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Get,
  Query,
  Req,
  Res,
  Headers,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { JwtService } from '@nestjs/jwt';
import { TokenExpiredError } from 'jsonwebtoken';
import { Public } from 'src/api/auth/jwt-guard/public.decorator';
import { jwtConstants } from 'src/api/auth/constants';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { assertCompanyAccess, DecodedJwtPayload } from 'src/api/users/ai-status-snapshot/auth-helper';
import { AiChatOrchestratorService } from './services/ai-chat-orchestrator.service';
import { AiChatRunsService } from './services/ai-chat-runs.service';
import {
  AiChatEventsService,
  AiChatPushEvent,
} from './services/ai-chat-events.service';
import {
  LlmMessage,
} from './llm/llm-provider.interface';

interface SendChatBody {
  message: string;
  companyId: number;
  conversationId?: string | null;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  pageContext?: { path?: string; entity?: string; entityId?: string | number };
}

/**
 * REST entry-point for the read-only AI chat agent (Task #162).
 *
 * - `POST /api/ai/chat`         — start a run; streams Server-Sent Events.
 * - `POST /api/ai/runs/:id/stop` — abort an in-flight run.
 * - `GET  /api/ai/events`        — long-lived SSE channel for push events
 *                                  (currently: navigation requests + run summary).
 *
 * Auth follows the same `@Public()` + manual `jwtService.verify` pattern as
 * `AiStatusSnapshotController`. We never trust the body's `userId` — it's
 * always taken from the JWT — and `assertCompanyAccess` cross-checks the
 * caller against `companySpecificRoles` for the requested company.
 */
@Controller('api/ai')
export class AiChatController {
  private readonly logger = new PaytradeLogger('AI_CHAT_CONTROLLER');

  constructor(
    private readonly orchestrator: AiChatOrchestratorService,
    private readonly runs: AiChatRunsService,
    private readonly events: AiChatEventsService,
    private readonly jwtService: JwtService,
  ) {}

  @Public()
  @Post('chat')
  async chat(
    @Req() req: Request,
    @Res() res: Response,
    @Headers('authorization') authHeader: string | undefined,
    @Body() body: SendChatBody,
  ) {
    const decoded = this.requireAuth(authHeader);
    const userId = Number(decoded.userId);
    if (!userId) throw new ForbiddenException('Authorization required');

    const companyId = Number(body?.companyId);
    if (!companyId || Number.isNaN(companyId)) {
      throw new HttpException(
        'companyId is required',
        HttpStatus.BAD_REQUEST,
      );
    }
    assertCompanyAccess(decoded, companyId);

    const message = (body?.message || '').trim();
    if (!message) {
      throw new HttpException(
        'message is required',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (message.length > 4000) {
      throw new HttpException(
        'message is too long (max 4000 characters)',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Set up SSE response headers.
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const write = (event: string, data: any) => {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    const history: LlmMessage[] = (body.history ?? [])
      .filter(
        (m) =>
          m &&
          (m.role === 'user' || m.role === 'assistant') &&
          typeof m.content === 'string' &&
          m.content.length > 0,
      )
      .slice(-20)
      .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));

    let clientGone = false;
    req.on('close', () => {
      clientGone = true;
    });

    try {
      const generator = this.orchestrator.run({
        userId,
        companyId,
        conversationId: body.conversationId ?? null,
        userMessage: message,
        history,
        pageContext: body.pageContext,
      });

      for await (const event of generator) {
        if (clientGone) break;
        write(event.type, event);
      }
    } catch (err: any) {
      this.logger.error(`chat stream error: ${err?.message || err}`);
      write('run_completed', {
        type: 'run_completed',
        runId: '',
        status: 'failed',
        summary: {
          amountChargedUsd: 0,
          multiplier: 1,
          rawCostUsd: 0,
          totalTokens: 0,
          toolCallCount: 0,
          durationMs: 0,
          model: null,
        },
        errorMessage: err?.message || 'Stream failed',
      });
    } finally {
      try {
        res.end();
      } catch {
        // already closed
      }
    }
  }

  @Public()
  @Post('runs/:runId/stop')
  @HttpCode(HttpStatus.OK)
  async stopRun(
    @Headers('authorization') authHeader: string | undefined,
    @Param('runId') runId: string,
  ) {
    const decoded = this.requireAuth(authHeader);
    const userId = Number(decoded.userId);
    if (!userId) throw new ForbiddenException('Authorization required');

    const run = await this.runs.findRunForUser(runId, userId);
    if (!run) {
      throw new HttpException('Run not found', HttpStatus.NOT_FOUND);
    }
    const aborted = this.runs.abort(runId);
    return { status: 'SUCCESS', stopped: aborted, runId };
  }

  @Public()
  @Get('events')
  async events_stream(
    @Req() req: Request,
    @Res() res: Response,
    @Query('token') tokenParam: string | undefined,
    @Headers('authorization') authHeader: string | undefined,
  ) {
    // SSE clients (EventSource) cannot set custom headers, so we
    // also accept the JWT via `?token=`. This matches the pattern
    // used elsewhere in the platform.
    const token = tokenParam ||
      (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined);
    if (!token) throw new ForbiddenException('Authorization required');
    let decoded: DecodedJwtPayload;
    try {
      decoded = this.jwtService.verify<DecodedJwtPayload>(token, {
        secret: jwtConstants.secret,
      });
    } catch (err) {
      if (err instanceof TokenExpiredError) {
        throw new ForbiddenException(
          'Your session has expired. Please log in again.',
        );
      }
      throw new ForbiddenException('Invalid token');
    }
    const userId = Number(decoded?.userId);
    if (!userId) throw new ForbiddenException('Authorization required');

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();
    res.write(`event: hello\ndata: ${JSON.stringify({ ok: true })}\n\n`);

    const unsubscribe = this.events.subscribe(userId, (event: AiChatPushEvent) => {
      try {
        res.write(`event: ${event.type}\n`);
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      } catch {
        // client disconnected; cleanup happens in `close` handler
      }
    });

    const heartbeat = setInterval(() => {
      try {
        res.write(`: keepalive ${Date.now()}\n\n`);
      } catch {
        clearInterval(heartbeat);
      }
    }, 25000);

    req.on('close', () => {
      clearInterval(heartbeat);
      unsubscribe();
      try {
        res.end();
      } catch {
        // already closed
      }
    });
  }

  private requireAuth(authHeader: string | undefined): DecodedJwtPayload {
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : undefined;
    if (!token) throw new ForbiddenException('Authorization Token Required');
    try {
      return this.jwtService.verify<DecodedJwtPayload>(token, {
        secret: jwtConstants.secret,
      });
    } catch (err) {
      if (err instanceof TokenExpiredError) {
        throw new ForbiddenException(
          'Your session has expired. Please log in again.',
        );
      }
      throw new ForbiddenException('Invalid token');
    }
  }
}
