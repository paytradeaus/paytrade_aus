import {
  Body,
  Controller,
  Headers,
  HttpException,
  HttpStatus,
  Post,
  Res,
} from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { Response } from 'express';
import { jwtConstants } from 'src/api/auth/constants';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { AiChatService } from './ai-chat.service';

@Controller('ai-chat')
export class AiChatController {
  private logger = new PaytradeLogger('AI_CHAT_STREAM');

  constructor(private readonly aiChatService: AiChatService) {}

  @Post('stream')
  async stream(
    @Headers('authorization') authHeader: string,
    @Body() body: { message?: string; pageContext?: any },
    @Res() res: Response,
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new HttpException('Authorization Token Required', HttpStatus.FORBIDDEN);
    }
    const token = authHeader.split(' ')[1];

    let userId: number | null = null;
    try {
      const decoded: any = jwt.verify(token, jwtConstants.secret);
      userId = decoded?.userId || null;
    } catch (err: any) {
      throw new HttpException('Invalid token', HttpStatus.FORBIDDEN);
    }
    if (!userId) {
      throw new HttpException('Please log in.', HttpStatus.FORBIDDEN);
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const send = (event: string, data: any) => {
      try {
        res.write(`event: ${event}\n`);
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      } catch {
        /* client disconnected */
      }
    };

    let closed = false;
    const abortController = new AbortController();
    res.on('close', () => {
      closed = true;
      // Client disconnected (e.g. user clicked Stop). Tell the OpenAI
      // stream to stop so we don't waste tokens after the user has
      // moved on. Whatever was streamed so far will still be persisted
      // by the service as the final assistant message.
      try {
        abortController.abort();
      } catch {
        /* noop */
      }
    });

    try {
      const result = await this.aiChatService.sendMessage(
        userId,
        body?.message || '',
        body?.pageContext,
        (chunk: string) => {
          if (closed) return;
          send('delta', { content: chunk });
        },
        abortController.signal,
      );

      send('done', {
        status: result.status,
        message: result.message || null,
        remainingQuota:
          typeof result.remainingQuota === 'number' ? result.remainingQuota : null,
        history: result.history,
      });
    } catch (err: any) {
      this.logger.error(`Stream error for user=${userId}: ${err?.message}`);
      send('error', { message: 'Something went wrong. Please try again later.' });
    } finally {
      try {
        res.end();
      } catch {
        /* noop */
      }
    }
  }
}
