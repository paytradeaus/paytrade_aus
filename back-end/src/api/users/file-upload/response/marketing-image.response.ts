import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType({
  description: 'A single marketing image stored in object storage.',
})
export class MarketingImageItem {
  @Field({ description: 'The file name of the marketing image.' })
  name: string;

  @Field({ description: 'The full public URL of the marketing image.' })
  url: string;
}

@ObjectType({
  description: 'Response returned after uploading a marketing image.',
})
export class MarketingImageUploadResponse {
  @Field({ description: 'Status of the upload operation (SUCCESS / ERROR).' })
  status: string;

  @Field({ description: 'Human readable message describing the result.' })
  message: string;

  @Field({
    nullable: true,
    description: 'The full public URL of the uploaded image, if successful.',
  })
  url?: string;
}

@ObjectType({
  description: 'Response returned when listing marketing images.',
})
export class MarketingImageListResponse {
  @Field({ description: 'Status of the list operation (SUCCESS / ERROR).' })
  status: string;

  @Field({ description: 'Human readable message describing the result.' })
  message: string;

  @Field(() => [MarketingImageItem], {
    nullable: true,
    description: 'The list of stored marketing images.',
  })
  data?: MarketingImageItem[];
}
