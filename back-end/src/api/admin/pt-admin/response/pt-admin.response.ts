import { ObjectType, Field, Int } from '@nestjs/graphql';
import { SignatureType } from 'src/entities/subscription-details.entity';

@ObjectType({ description: 'Represents a Project Trade Admin user' })
export class PTAdmins {
  @Field({ description: 'Unique identifier of the admin' })
  id: string;

  @Field({ description: 'First name of the admin user' })
  first_name: string;

  @Field({ nullable: true, description: 'Last name of the admin user' })
  last_name?: string;

  @Field({ description: 'Email address of the admin user' })
  email_id: string;

  @Field({
    description: 'Current status of the admin (e.g., active, inactive)',
  })
  admin_status: string;

  @Field({
    nullable: true,
    description: 'Signature of the admin user if provided',
  })
  signature?: string;

  @Field({ nullable: true, description: 'Type of signature (if any)' })
  signature_type?: SignatureType;

  @Field({ description: 'Role of the admin user' })
  admin_role: string;

  @Field({ nullable: true, description: 'Timestamp of the last login' })
  last_logged_in?: Date;

  @Field({
    nullable: true,
    description: 'Timestamp when the admin record was created',
  })
  created_on?: Date;
}

@ObjectType({
  description: 'Response wrapper for a single Project Trade Admin user',
})
export class PTAdminResponse {
  @Field({ description: 'Status of the API response' })
  status: string;

  @Field({ description: 'Message describing the API response' })
  message: string;

  @Field({ nullable: true, description: 'Details of the admin user if found' })
  data?: PTAdmins;
}
