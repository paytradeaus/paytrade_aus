import { ObjectType, Field, Int } from '@nestjs/graphql';
import { SignatureType } from 'src/entities/subscription-details.entity';

@ObjectType({
  description:
    'Details of a Project Trade Admin user along with group memberships',
})
export class PTAdminGroup {
  @Field({ description: 'Unique ID of the admin' })
  id: string;

  @Field({ description: 'First name of the admin' })
  first_name: string;

  @Field({ nullable: true, description: 'Last name of the admin' })
  last_name?: string;

  @Field({ description: 'Email address of the admin' })
  email_id: string;

  @Field({ nullable: true, description: 'Digital signature of the admin' })
  signature?: string;

  @Field({
    nullable: true,
    description: 'Type of the signature (e.g., image, text)',
  })
  signature_type?: SignatureType;

  @Field({ description: 'Current status of the admin account' })
  admin_status: string;

  @Field({ description: 'Role assigned to the admin' })
  admin_role: string;

  @Field({
    nullable: true,
    description: 'Timestamp of the last login of the admin',
  })
  last_logged_in?: Date;

  @Field({
    nullable: true,
    description: 'Timestamp indicating when the record was created',
  })
  created_on?: Date;

  @Field(() => [String], {
    nullable: true,
    description: 'IDs of groups assigned to the admin',
  })
  groupIds?: string[];

  @Field({ nullable: true, description: 'Profile ID linked to the admin' })
  profile_id?: string;

  @Field({
    nullable: true,
    description: 'File path of the admin’s profile document or signature',
  })
  file_path?: string;

  @Field({
    nullable: true,
    description: 'File type of the admin’s profile document or signature',
  })
  file_type?: string;

  @Field({
    nullable: true,
    description: 'Base64 or URL string of the file content',
  })
  file?: string;
}

@ObjectType({
  description: 'Response wrapper for a single Project Trade Admin group record',
})
export class PTAdminGroupResponse {
  @Field({ description: 'Status of the API response' })
  status: string;

  @Field({ description: 'Message describing the response' })
  message: string;

  @Field({
    nullable: true,
    description: 'Data of the requested PTAdminGroup record',
  })
  data?: PTAdminGroup;
}
