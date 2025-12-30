import { Field, InputType } from '@nestjs/graphql';
import { GraphQLUpload } from 'graphql-upload';
import { CreateFileUploadInput } from './create-file-upload.input';

@InputType({
  description: 'Input for uploading multiple files along with their metadata.',
})
export class UploadMultipleFilesInput {
  @Field(() => [GraphQLUpload], {
    description: 'Array of files to be uploaded.',
  })
  files: GraphQLUpload[];

  @Field(() => [CreateFileUploadInput], {
    description:
      'Array of file metadata/details corresponding to each uploaded file.',
  })
  detailsOfFiles: CreateFileUploadInput[];
}
