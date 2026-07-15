import { Body, Controller, Post, Req, Res } from '@nestjs/common';
import { Public } from '../auth/jwt-guard/public.decorator';
import { Request, Response } from 'express';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { SupportService } from './support.service';

@Controller('support-ticket')
export class SupportController {
  private logger: PaytradeLogger;
  // Simple in-memory per-IP rate limit for the public client-error endpoint.
  private clientErrorHits: Map<string, { count: number; windowStart: number }> =
    new Map();

  constructor(private readonly supportService: SupportService) {
    this.logger = new PaytradeLogger('SUPPORT_TCIKET_CONTROLLER');
  }

  private clientErrorGlobal: { count: number; windowStart: number } = {
    count: 0,
    windowStart: 0,
  };

  private isClientErrorRateLimited(ip: string): boolean {
    const WINDOW_MS = 60_000;
    const MAX_PER_WINDOW = 5;
    // Hard global cap: x-forwarded-for is client-controlled when the app is
    // not behind a trusted proxy config, so per-IP buckets can be rotated.
    // The global cap bounds total DB writes + support emails regardless.
    const GLOBAL_MAX_PER_WINDOW = 30;
    const now = Date.now();
    if (now - this.clientErrorGlobal.windowStart > WINDOW_MS) {
      this.clientErrorGlobal = { count: 1, windowStart: now };
    } else {
      this.clientErrorGlobal.count += 1;
      if (this.clientErrorGlobal.count > GLOBAL_MAX_PER_WINDOW) return true;
    }
    const entry = this.clientErrorHits.get(ip);
    if (!entry || now - entry.windowStart > WINDOW_MS) {
      this.clientErrorHits.set(ip, { count: 1, windowStart: now });
      // Opportunistic cleanup so the map cannot grow unbounded.
      if (this.clientErrorHits.size > 1000) {
        for (const [key, value] of this.clientErrorHits) {
          if (now - value.windowStart > WINDOW_MS)
            this.clientErrorHits.delete(key);
        }
      }
      return false;
    }
    entry.count += 1;
    return entry.count > MAX_PER_WINDOW;
  }

  @Public()
  @Post('client-error')
  async handleClientError(
    @Req() request: Request,
    @Res() response: Response,
    @Body() body: any,
  ) {
    try {
      const ip =
        (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        request.ip ||
        'unknown';
      if (this.isClientErrorRateLimited(ip)) {
        return response.status(429).json({ received: false });
      }
      if (!body || typeof body.message !== 'string' || !body.message.trim()) {
        return response.status(400).json({ received: false });
      }
      const result = await this.supportService.createClientErrorTicket({
        message: body.message,
        stack: typeof body.stack === 'string' ? body.stack : undefined,
        digest: typeof body.digest === 'string' ? body.digest : undefined,
        url: typeof body.url === 'string' ? body.url : undefined,
        userAgent:
          typeof request.headers['user-agent'] === 'string'
            ? request.headers['user-agent']
            : undefined,
        userEmail:
          typeof body.userEmail === 'string' ? body.userEmail : undefined,
        companyId:
          typeof body.companyId === 'string' ? body.companyId : undefined,
      });
      return response
        .status(result ? 200 : 500)
        .json({ received: !!result, ticketId: result?.ticketId ?? null });
    } catch (error) {
      this.logger.error(
        `Errored inside handleClientError: ${error?.message || error}`,
      );
      return response.status(500).json({ received: false });
    }
  }

  @Public()
  @Post('webhook')
  async handleMailGunWebhook(
    @Req() request: Request,
    @Res() response: Response,
    @Body() body: any,
  ) {
    try {
      this.logger.log(
        `Request received for handleStripeWebhook with payload: ${JSON.stringify(body)}`,
      );

      this.logger.log('Initialized Support Ticket Webhook');

      // Example: capture fields
      const payload = {
        fromEmail: body?.sender,
        toEmail: body?.recipient,
        subject: body?.subject,
        body: body?.['stripped-text'] || body?.['body-plain'],
        messageId: body?.['Message-Id'],
        inReplyTo: body?.['In-Reply-To'], // create new ticket if inReplyTo null or Link to existing Ticket Mails by messageId
      };

      this.logger.log(`Support Ticket payload: ${JSON.stringify(payload)}`);

      if (payload?.messageId) {
        await this.supportService.handleMailGunWebhook(payload);
      }

      this.logger.log(`Respone sent back: ${JSON.stringify(payload)}`);
      this.logger.log('Support Ticket response back to hooks');

      response.status(200).json({ received: true });
    } catch (error) {
      const errorMessage = error.message ? error.message : error;
      this.logger.error(
        `Errored inside the handleMailGunWebhook with message: ${errorMessage}`,
      );
      this.logger.error(`Failed MailGun Webhook Webhook - ${errorMessage}`);
      return response.status(400).send(`Webhook Error: ${errorMessage}`);
    }
  }
}
