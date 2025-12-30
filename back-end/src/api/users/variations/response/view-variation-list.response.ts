import { ObjectType, Field } from '@nestjs/graphql';
import { VariationStatus } from 'src/entities/variation-details.entity';

@ObjectType({
  description:
    'Detailed view of a single variation, including associated project, contract, and attachments.',
})
export class ViewVariationRes {
  @Field({
    nullable: true,
    description: 'Unique identifier of the variation record.',
  })
  id: string;

  @Field({ nullable: true, description: 'Auto-incremented variation ID.' })
  variation_id: number;

  @Field({ nullable: true, description: 'Name or title of the variation.' })
  variation_name: string;

  @Field({ nullable: true, description: 'Current status of the variation.' })
  variation_status: VariationStatus;

  @Field({
    nullable: true,
    description: 'Indicates if the variation is archived.',
  })
  is_archived: Boolean;

  @Field({
    nullable: true,
    description: 'Timestamp when the variation was created.',
  })
  created_on: Date;

  @Field({
    nullable: true,
    description: 'ID of the business associated with this variation.',
  })
  company_id: number;

  @Field({
    nullable: true,
    description: 'ID of the project associated with this variation.',
  })
  project_id: number;

  @Field({ nullable: true, description: 'Name of the project.' })
  project_name: string;

  @Field({
    nullable: true,
    description: 'ID of the contract associated with this variation.',
  })
  contract_id: number;

  @Field({ nullable: true, description: 'Name of the contract.' })
  contract_name: string;

  @Field({ nullable: true, description: 'Monetary value of the variation.' })
  variation_amount: number;

  @Field({
    nullable: true,
    description: 'Formatted string version of the variation amount.',
  })
  formatted_variation_amount: string;

  @Field({
    nullable: true,
    description: 'Attachment ID associated with this variation.',
  })
  attachment_id: string;

  @Field({ nullable: true, description: 'Name of the attached file.' })
  file_name?: string;

  @Field({ nullable: true, description: 'Type of the attached file.' })
  file_type?: string;

  @Field({ nullable: true, description: 'Path or URL of the attached file.' })
  file_path?: string;

  @Field({
    nullable: true,
    description: 'Base64 or accessible URL of the attached file.',
  })
  file?: string;
}

@ObjectType({
  description:
    'Response containing a list of variations for a business or project.',
})
export class ViewVariationListRes {
  @Field(() => [ViewVariationRes], {
    nullable: true,
    description: 'Array of variation details.',
  })
  variation_list: ViewVariationRes[];

  @Field({ description: 'Total count of variations matching the query.' })
  total_count: Number;
}

@ObjectType({
  description: 'API response wrapper for fetching a list of variations.',
})
export class ViewVariationListResponse {
  @Field({ description: 'API response status (e.g., SUCCESS or ERROR).' })
  status: string;

  @Field({ description: 'API response message.' })
  message: string;

  @Field({
    nullable: true,
    description: 'Data containing variations list and count.',
  })
  data?: ViewVariationListRes;
}

@ObjectType({
  description: 'API response wrapper for fetching a single variation detail.',
})
export class ViewVariationResponse {
  @Field({ description: 'API response status (e.g., SUCCESS or ERROR).' })
  status: string;

  @Field({ description: 'API response message.' })
  message: string;

  @Field({
    nullable: true,
    description: 'Detailed data of the requested variation.',
  })
  data?: ViewVariationRes;
}

@ObjectType({
  description:
    'Simplified variation data used in select queries or attachments only.',
})
export class GetVariationRes {
  @Field({
    nullable: true,
    description: 'Unique identifier of the variation record.',
  })
  id: string;

  @Field({ nullable: true, description: 'Auto-incremented variation ID.' })
  variation_id: number;

  @Field({ nullable: true, description: 'Name or title of the variation.' })
  variation_name: string;

  @Field({ nullable: true, description: 'Current status of the variation.' })
  variation_status: VariationStatus;

  @Field({
    nullable: true,
    description: 'Business ID associated with the variation.',
  })
  company_id: number;

  @Field({
    nullable: true,
    description: 'Project ID associated with the variation.',
  })
  project_id: number;

  @Field({
    nullable: true,
    description: 'Contract ID associated with the variation.',
  })
  contract_id: number;

  @Field({ nullable: true, description: 'Monetary value of the variation.' })
  variation_amount: number;

  @Field({
    nullable: true,
    description: 'Attachment ID associated with this variation.',
  })
  attachment_id: string;
}

@ObjectType({
  description: 'API response wrapper for fetching a single variation record.',
})
export class GetVariationResponse {
  @Field({ description: 'API response status (e.g., SUCCESS or ERROR).' })
  status: string;

  @Field({ description: 'API response message.' })
  message: string;

  @Field({ nullable: true, description: 'Variation data if found.' })
  data?: GetVariationRes;
}
