import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommonApiService } from './common-api.service';
import { CommonApiResolver } from './common-api.resolver';
import { AccountingSystem } from 'src/entities/accounting-system.entity';
import { CISRate } from 'src/entities/cis-rate.entity';
import { Settings } from 'src/entities/settings.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AccountingSystem, CISRate, Settings])],
  providers: [CommonApiResolver, CommonApiService],
  exports: [CommonApiService],
})
export class CommonApiModule {}
