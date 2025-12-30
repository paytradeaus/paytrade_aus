import { ObjectType, Field } from '@nestjs/graphql';
import { FileUploadRes } from './file-upload.response';

@ObjectType({ description: 'Response object for multiple file uploads.' })
export class MultipleFilesUploadResponse {
  @Field({
    description:
      'Status of the multiple file upload operation (e.g., success or failure).',
  })
  status: string;

  @Field({
    description:
      'Message providing additional information about the upload operation.',
  })
  message: string;

  @Field(() => [FileUploadRes], {
    nullable: true,
    description: 'Array of uploaded file details.',
  })
  data?: FileUploadRes[];
}
