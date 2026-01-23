import { Injectable } from '@nestjs/common';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';

@Injectable()
export class SupportWebhooksService {
  private logger = new PaytradeLogger('SUPPORT_WEBHOOKS_SERVICE');

  async processInboundEmail(payload: any) {
    this.logger.log(`[SupportMailService] Received inbound email: ${JSON.stringify(payload)}`);

    // Example payload structure:
    // {
    //   "event": "inboundEmailProcessed",
    //   "email": {
    //      "subject": "Support request",
    //      "text": "Hello, I need help...",
    //      "attachments": [...]
    //   }
    // }

    // TODO:
    // - Extract sender, subject, body
    // - Save to DB as a ticket
    // - Handle replies to existing tickets

    return { status: 'ok', received: true };
  }
}
