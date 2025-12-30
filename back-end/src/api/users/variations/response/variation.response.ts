import { ObjectType, Field, Int } from '@nestjs/graphql';
import { VariationStatus } from 'src/entities/variation-details.entity';

@ObjectType({ description: 'Details of a specific variation record.' })
export class VariationDetailsRes {
  @Field({ description: 'Unique identifier of the variation record.' })
  id: string;

  @Field({ description: 'Auto-incremented variation ID.' })
  variation_id: number;

  @Field({ description: 'Name or title of the variation.' })
  variation_name: string;

  @Field({ description: 'ID of the business associated with this variation.' })
  company_id: number;

  @Field({ description: 'ID of the project associated with this variation.' })
  project_id: number;

  @Field({ nullable: true, description: 'Current status of the variation.' })
  variation_status: VariationStatus;
}

@ObjectType({
  description: 'Response object for fetching a variation details record.',
})
export class VariationDetailsResponse {
  @Field({ description: 'API response status (e.g., SUCCESS or ERROR).' })
  status: string;

  @Field({ description: 'API response message.' })
  message: string;

  @Field({ nullable: true, description: 'Variation details data if found.' })
  data?: VariationDetailsRes;
}
