import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType({
  description: 'Represents a single uploaded file with its metadata.',
})
export class GetFileRes {
  @Field({ nullable: true, description: 'Unique identifier of the file.' })
  id: string;

  @Field({
    nullable: true,
    description: 'Base64 string or URL of the file content.',
  })
  file: string;

  @Field({ nullable: true, description: 'Storage path of the uploaded file.' })
  file_path: string;

  @Field({
    nullable: true,
    description: 'Type of the file (e.g., pdf, png, jpg, etc.).',
  })
  file_type: string;

  @Field({
    nullable: true,
    description: 'Original or custom name of the uploaded file.',
  })
  file_name: string;

  @Field({
    nullable: true,
    description:
      'Type/category of the attachment (e.g., notice, invoice, document).',
  })
  attachment_type: string;
}

@ObjectType({
  description: 'Standard response for fetching a single uploaded file.',
})
export class GetFileResponse {
  @Field({ description: 'Status of the operation (e.g., success or failure).' })
  status: string;

  @Field({
    description: 'Message providing additional details about the operation.',
  })
  message: string;

  @Field({
    nullable: true,
    description: 'The uploaded file details if available.',
  })
  data?: GetFileRes;
}
