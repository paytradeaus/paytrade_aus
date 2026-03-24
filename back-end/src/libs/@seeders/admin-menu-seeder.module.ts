import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminMenuDetails } from 'src/entities/admin-menu-details.entity';
import { AdminGroupDetails } from 'src/entities/admin-group-details.entity';
import { AdminGroupMenuPriv } from 'src/entities/admin-group-menu-priv.entity';
import { AdminMenuSeederService } from './admin-menu-seeder.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AdminMenuDetails,
      AdminGroupDetails,
      AdminGroupMenuPriv,
    ]),
  ],
  providers: [AdminMenuSeederService],
})
export class AdminMenuSeederModule {}
