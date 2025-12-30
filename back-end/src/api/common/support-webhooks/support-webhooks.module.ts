import { Module } from '@nestjs/common';
import { SupportWebhooksResolver } from './support-webhooks.resolver';
import { SupportWebhooksService } from './support-webhooks.service';

@Module({

  controllers: [SupportWebhooksResolver],
  providers: [SupportWebhooksService]
})
export class SupportWebhooksModule { }
