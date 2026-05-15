import { Module } from '@nestjs/common';
import { AiChatFoundationSeederService } from './ai-chat-foundation-seeder.service';

@Module({
  providers: [AiChatFoundationSeederService],
  exports: [AiChatFoundationSeederService],
})
export class AiChatFoundationSeederModule {}
