import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType({
  description: 'Details of a holiday record associated with a file.',
})
class HolidayRecordData {
  @Field({ nullable: true, description: 'Name of the holiday.' })
  holiday_name: string;

  @Field({ nullable: true, description: 'Date of the holiday.' })
  holiday_date: Date;

  @Field({
    nullable: true,
    description: 'Indicates if the holiday recurs every year.',
  })
  recurring_every_year: string;

  @Field({
    nullable: true,
    description: 'Optional message related to the holiday.',
  })
  message: string;
}

@ObjectType({
  description:
    'Response object representing the uploaded file and its details.',
})
export class FileUploadRes {
  @Field({ description: 'Unique identifier for the uploaded file.' })
  id: string;

  @Field({ description: 'Base64 or URL string of the uploaded file content.' })
  file: string;

  @Field({ description: 'Path where the uploaded file is stored.' })
  file_path: string;

  @Field({ description: 'Type of the uploaded file (e.g., pdf, png, etc.).' })
  file_type: string;

  @Field({ description: 'Original name of the uploaded file.' })
  file_name: string;

  @Field({ description: 'Type of attachment (e.g., document, image, notice).' })
  attachment_type: string;

  @Field(() => [HolidayRecordData], {
    nullable: true,
    description: 'List of holiday records extracted from the file, if any.',
  })
  holiday_record?: HolidayRecordData[];

  @Field({
    nullable: true,
    description:
      'Indicates whether valid holiday records are available in the file.',
  })
  is_valid_record_available?: boolean;
}

@ObjectType({
  description: 'General response wrapper for file upload operations.',
})
export class FileUploadResponse {
  @Field({
    description:
      'Status of the file upload operation (e.g., success, failure).',
  })
  status: string;

  @Field({
    description: 'Additional message providing details about the operation.',
  })
  message: string;

  @Field({
    nullable: true,
    description: 'Data object containing details of the uploaded file.',
  })
  data?: FileUploadRes;
}
