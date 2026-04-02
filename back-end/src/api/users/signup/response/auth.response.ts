import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType({
  description:
    'Represents authentication tokens issued after successful login.',
})
export class AuthRes {
  @Field({
    description: 'JWT access token used for authenticating API requests.',
  })
  access_token: string;

  @Field({
    description: 'JWT refresh token used to obtain a new access token.',
  })
  refresh_token: string;
}

@ObjectType({
  description:
    'Standard authentication response containing status, message, and token data.',
})
export class AuthResponse {
  @Field({
    description: 'Indicates whether the authentication request was successful.',
  })
  status: string;

  @Field({
    description: 'Human-readable message describing the authentication result.',
  })
  message: string;

  @Field({
    nullable: true,
    description: 'Authentication token details returned on success.',
  })
  data?: AuthRes;
}

@ObjectType({
  description: 'Represents metadata of an exported or uploaded file.',
})
export class Filedetails {
  @Field({
    description: 'Original name of the file.',
  })
  file_name: string;

  @Field({
    description: 'Storage path or URL where the file is located.',
  })
  file_path: string;

  @Field({
    description: 'MIME type or file format.',
  })
  file_type: string;

  @Field({
    description: 'Unique identifier of the stored attachment.',
  })
  attachment_id: string;
}

@ObjectType({
  description:
    'Response returned after exporting audit data, including file details.',
})
export class auditExportResponse {
  @Field({
    description: 'Indicates whether the export operation was successful.',
  })
  status: string;

  @Field({
    nullable: true,
    description: 'Message describing the result of the export operation.',
  })
  message: string;

  @Field({
    nullable: true,
    description: 'Details of the generated export file.',
  })
  file: Filedetails;
}

@ObjectType({
  description:
    'Generic response type used for operations that return only status and message.',
})
export class StringResponse {
  @Field({
    description: 'Indicates whether the operation was successful.',
  })
  status: string;

  @Field({
    description: 'Human-readable message describing the operation result.',
  })
  message: string;
}

@ObjectType({
  description:
    'Response type that includes status, message, and a boolean data field.',
})
export class BooleanDataResponse {
  @Field({ description: 'Indicates whether the operation was successful.' })
  status: string;

  @Field({ description: 'Human-readable message describing the operation result.' })
  message: string;

  @Field(() => Boolean, { nullable: true, description: 'Boolean result data.' })
  data?: boolean;
}
