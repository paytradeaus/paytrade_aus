import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType({
  description: 'Represents detailed information about a single uploaded file.',
})
export class GetFileDetailsRes {
  @Field({ description: 'Unique identifier of the file.' })
  id: string;

  @Field({ nullable: true, description: 'Optional name of the file.' })
  name: string;

  @Field({ description: 'Type of the file (e.g., pdf, png, jpg, etc.).' })
  file_type: string;

  @Field({ description: 'Storage path of the uploaded file.' })
  file_path: string;

  @Field({ description: 'Date and time when the file was uploaded.' })
  uploaded_on: Date;

  @Field({ description: 'Base64 string or URL of the uploaded file content.' })
  file: string;
}

@ObjectType({
  description: 'General response wrapper for fetching file details.',
})
export class GetFileDetailsResponse {
  @Field({
    description: 'Status of the fetch operation (e.g., success, failure).',
  })
  status: string;

  @Field({
    description: 'Additional message providing details about the operation.',
  })
  message: string;

  @Field(() => [GetFileDetailsRes], {
    nullable: true,
    description: 'List of uploaded file details.',
  })
  data?: GetFileDetailsRes[];
}
