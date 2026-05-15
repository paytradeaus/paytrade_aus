import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserDetails } from 'src/entities/user-details.entity';
import { JwtInternalService } from 'src/libs/@jwt-internal-services/jwt.internal.service';
import { AiSupportModule } from '../ai-support/ai-support.module';
import { AiChatService } from './ai-chat.service';
import { AiChatResolver } from './ai-chat.resolver';

@Module({
  imports: [TypeOrmModule.forFeature([UserDetails]), AiSupportModule],
  providers: [AiChatService, AiChatResolver, JwtInternalService],
  exports: [AiChatService],
})
export class AiChatModule {}
