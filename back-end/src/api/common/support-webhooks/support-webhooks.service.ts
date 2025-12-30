import { Injectable } from '@nestjs/common';

@Injectable()
export class SupportWebhooksService {
  async processInboundEmail(payload: any) {
    console.log(' [SupportMailService] Received inbound email:', payload);

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
