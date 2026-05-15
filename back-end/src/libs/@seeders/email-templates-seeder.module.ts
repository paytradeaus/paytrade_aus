import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailTemplates } from 'src/entities/email-templates.entity';
import { EmailTemplatesSeederService } from './email-templates-seeder.service';

@Module({
  imports: [TypeOrmModule.forFeature([EmailTemplates])],
  providers: [EmailTemplatesSeederService],
})
export class EmailTemplatesSeederModule {}
