import { Module } from '@nestjs/common';
import { ContactLogNoiseSweepSeederService } from './contact-log-noise-sweep-seeder.service';

@Module({
  providers: [ContactLogNoiseSweepSeederService],
})
export class ContactLogNoiseSweepSeederModule {}
