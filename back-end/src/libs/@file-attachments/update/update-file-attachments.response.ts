import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class UpdateFileAttachmentsOrDocuments {
  @Field()
  id: string;

  @Field()
  file_path: string;

  @Field()
  file_type: string;

  @Field({ nullable: true })
  name: string;

  @Field()
  uploaded_on: Date;

  @Field()
  attachment_type: string;

  @Field()
  file: string;
}

@ObjectType()
export class UpdateFileAttachmentsOrDocumentsResponse {
  @Field()
  status: string;

  @Field()
  message: string;

  @Field(() => [UpdateFileAttachmentsOrDocuments], { nullable: true })
  data: UpdateFileAttachmentsOrDocuments[];
}
