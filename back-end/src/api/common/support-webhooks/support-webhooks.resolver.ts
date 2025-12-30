import { Controller, Post, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import * as crypto from 'crypto';
import { SupportWebhooksService } from './support-webhooks.service';
import { Public } from 'src/api/auth/jwt-guard/public.decorator';
// import { SupportMailService } from './support-mail.service';

@Controller('support-mail')
export class SupportWebhooksResolver {
  constructor(
    private readonly SupportWebhooksService: SupportWebhooksService,
  ) {}
  //   constructor(private readonly supportMailService: SupportMailService) {}

  @Post()
  @Public()
  async handleInboundWebhook(@Req() req: Request, @Res() res: Response) {
    try {
      const rawBody = (req as any).rawBody;
      if (!rawBody) {
        return res.status(500).send('Missing raw body');
      }

      // Optional HMAC verification
      if (process.env.SUPPORT_WEBHOOK_KEY) {
        console.log('[Support webhook verification');
      } else {
        console.log(
          '[Support Webhook] No Support_WEBHOOK_KEY set → skipping verification',
        );
      }

      res.status(200).send('OK');

      // Process async
      setImmediate(() => {
        try {
          const payload = JSON.parse(rawBody.toString('utf8'));
          this.SupportWebhooksService.processInboundEmail(payload);
        } catch (err) {
          console.error(
            '[Support Webhook] Failed to parse/process payload:',
            err.message,
          );
        }
      });
    } catch (err) {
      console.error('[Support Webhook] Error:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
  }
}
