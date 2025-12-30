import { Body, Controller, Post, Req, Res } from '@nestjs/common';
import { Public } from '../auth/jwt-guard/public.decorator';
import { Request, Response } from 'express';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { SupportService } from './support.service';

@Controller('support-ticket')
export class SupportController {
  private logger: PaytradeLogger;

  constructor(private readonly supportService: SupportService) {
    this.logger = new PaytradeLogger('SUPPORT_TCIKET_CONTROLLER');
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

      console.log('Initialized Support Ticket Webhook');

      // Example: capture fields
      const payload = {
        fromEmail: body?.sender,
        toEmail: body?.recipient,
        subject: body?.subject,
        body: body?.['stripped-text'] || body?.['body-plain'],
        messageId: body?.['Message-Id'],
        inReplyTo: body?.['In-Reply-To'], // create new ticket if inReplyTo null or Link to existing Ticket Mails by messageId
      };

      console.log('Support Ticket payload: ', payload);

      if (payload?.messageId) {
        await this.supportService.handleMailGunWebhook(payload);
      }

      this.logger.log(`Respone sent back: ${JSON.stringify(payload)}`);
      console.log('Support Ticket response back to hooks');

      response.status(200).json({ received: true });
    } catch (error) {
      const errorMessage = error.message ? error.message : error;
      this.logger.error(
        `Errored inside the handleMailGunWebhook with message: ${errorMessage}`,
      );
      console.log(`Failed MailGun Webhook Webhook - ${errorMessage}`);
      return response.status(400).send(`Webhook Error: ${errorMessage}`);
    }
  }
}
