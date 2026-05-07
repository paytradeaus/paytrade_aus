import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailTemplates } from 'src/entities/email-templates.entity';
import { EmailTemplateUrlCleanupSeederService } from './email-template-url-cleanup-seeder.service';

@Module({
  imports: [TypeOrmModule.forFeature([EmailTemplates])],
  providers: [EmailTemplateUrlCleanupSeederService],
})
export class EmailTemplateUrlCleanupSeederModule {}
