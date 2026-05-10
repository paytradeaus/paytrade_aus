import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityLogTemplates } from 'src/entities/activity-log-templates.entity';
import { ActivityLogTemplatePlaceholderSeederService } from './activity-log-template-placeholder-seeder.service';

@Module({
  imports: [TypeOrmModule.forFeature([ActivityLogTemplates])],
  providers: [ActivityLogTemplatePlaceholderSeederService],
})
export class ActivityLogTemplatePlaceholderSeederModule {}
