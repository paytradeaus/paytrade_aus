import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NoticeTemplates } from 'src/entities/notices-templates.entity';
import { NoticeTemplatesSeederService } from './notice-templates-seeder.service';

@Module({
  imports: [TypeOrmModule.forFeature([NoticeTemplates])],
  providers: [NoticeTemplatesSeederService],
})
export class NoticeTemplatesSeederModule {}
