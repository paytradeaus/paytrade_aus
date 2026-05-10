import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityLogTemplates } from 'src/entities/activity-log-templates.entity';
import { ActivityLogTemplatesSeederService } from './activity-log-templates-seeder.service';

@Module({
  imports: [TypeOrmModule.forFeature([ActivityLogTemplates])],
  providers: [ActivityLogTemplatesSeederService],
})
export class ActivityLogTemplatesSeederModule {}
