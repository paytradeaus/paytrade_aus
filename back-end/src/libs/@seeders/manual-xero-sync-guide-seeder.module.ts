import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlogResource } from 'src/entities/admin-blogs-resources.entity';
import { MasterTypes } from 'src/entities/master-types.entity';
import { ManualXeroSyncGuideSeederService } from './manual-xero-sync-guide-seeder.service';

@Module({
  imports: [TypeOrmModule.forFeature([BlogResource, MasterTypes])],
  providers: [ManualXeroSyncGuideSeederService],
})
export class ManualXeroSyncGuideSeederModule {}
