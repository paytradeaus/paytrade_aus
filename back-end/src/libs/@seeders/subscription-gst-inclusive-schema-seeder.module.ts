import { Module } from '@nestjs/common';
import { SubscriptionGstInclusiveSchemaSeederService } from './subscription-gst-inclusive-schema-seeder.service';

@Module({
  providers: [SubscriptionGstInclusiveSchemaSeederService],
  exports: [SubscriptionGstInclusiveSchemaSeederService],
})
export class SubscriptionGstInclusiveSchemaSeederModule {}
