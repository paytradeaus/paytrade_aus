import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  ComplianceChecks,
  ComplianceSettings,
  PtaCompliances,
  RtaCompliances,
} from 'src/entities/compliances.entity';
import { ComplianceSeederService } from './compliance-seeder.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ComplianceChecks,
      PtaCompliances,
      RtaCompliances,
      ComplianceSettings,
    ]),
  ],
  providers: [ComplianceSeederService],
})
export class ComplianceSeederModule {}
