import { Module } from '@nestjs/common';
import { ApcaNumberStringSchemaSeederService } from './apca-number-string-schema-seeder.service';

@Module({
  providers: [ApcaNumberStringSchemaSeederService],
})
export class ApcaNumberStringSchemaSeederModule {}
