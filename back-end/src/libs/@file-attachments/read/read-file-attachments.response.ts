import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class ReadFileAttachmentsOrDocuments {
  @Field()
  id: string;

  @Field()
  file_path: string;

  @Field()
  file_type: string;

  @Field()
  file_name: string;

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
export class ReadFileAttachmentsOrDocumentsResponse {
  @Field()
  status: string;

  @Field()
  message: string;

  @Field(() => [ReadFileAttachmentsOrDocuments], { nullable: true })
  data: ReadFileAttachmentsOrDocuments[];
}
