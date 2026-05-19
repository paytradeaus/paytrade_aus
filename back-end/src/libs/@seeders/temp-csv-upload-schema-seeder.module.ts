import { Module } from '@nestjs/common';
import { TempCsvUploadSchemaSeederService } from './temp-csv-upload-schema-seeder.service';

@Module({
  providers: [TempCsvUploadSchemaSeederService],
})
export class TempCsvUploadSchemaSeederModule {}
