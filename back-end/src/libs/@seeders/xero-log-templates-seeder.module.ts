import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { XeroLogTemplates } from 'src/entities/xero-log-templates.entity';
import { XeroLogTemplatesSeederService } from './xero-log-templates-seeder.service';

@Module({
  imports: [TypeOrmModule.forFeature([XeroLogTemplates])],
  providers: [XeroLogTemplatesSeederService],
})
export class XeroLogTemplatesSeederModule {}
