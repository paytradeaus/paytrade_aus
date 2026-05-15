import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CommonSettings } from 'src/entities/common-settings.entity';
import { AiCostMultiplierSeederService } from './ai-cost-multiplier-seeder.service';

@Module({
  imports: [TypeOrmModule.forFeature([CommonSettings])],
  providers: [AiCostMultiplierSeederService],
})
export class AiCostMultiplierSeederModule {}
