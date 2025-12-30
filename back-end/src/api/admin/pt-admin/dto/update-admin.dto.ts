import { InputType, Field, PartialType } from '@nestjs/graphql';
import { AdminStatus } from '../../../../entities/admin-details.entity';
import { Role } from 'src/api/auth/role-guard/role.enum';
import { SignatureType } from 'src/entities/subscription-details.entity';

@InputType({
  description: 'Input data required to update an existing admin user',
})
export class UpdateAdminInput {
  @Field({ nullable: true, description: 'ID of the admin to update' })
  id?: string;

  @Field({ nullable: true, description: 'First name of the admin' })
  first_name?: string;

  @Field({ nullable: true, description: 'Last name of the admin' })
  last_name?: string;

  @Field({ nullable: true, description: 'Email address of the admin' })
  email_id?: string;

  @Field({ nullable: true, description: 'Password for the admin account' })
  password?: string;

  @Field({ nullable: true, description: 'Digital signature of the admin' })
  signature?: string;

  @Field({
    nullable: true,
    description: 'Type of signature',
  })
  signature_type?: SignatureType;

  @Field({
    nullable: true,
    description: 'Status of the admin account',
  })
  admin_status?: AdminStatus;

  @Field({ nullable: true, description: 'Role of the admin' })
  admin_role?: Role;

  @Field(() => [String], {
    nullable: true,
    description: 'IDs of groups assigned to this admin',
  })
  group_ids?: string[];
}

@InputType({
  description: 'Input data for creating email verification for an admin',
})
export class CreateAdminEmailVerificationInput {
  @Field({ nullable: true, description: 'ID of the email verification record' })
  id?: string;

  @Field({ description: 'Email address to be verified' })
  email_id: string;

  @Field({
    description: 'Type of verification (e.g., registration, password_reset)',
  })
  type: string;

  @Field({ nullable: true, description: 'Generated verification code' })
  verification_code?: string;

  @Field({
    nullable: true,
    description: 'Expiration time of the verification code',
  })
  code_expires_in?: Date;

  @Field({
    nullable: true,
    description: 'User ID of the logged in user creating this verification',
  })
  created_by?: number;

  @Field({
    nullable: true,
    description: 'Timestamp when the record was created',
  })
  created_on?: Date;

  @Field({
    nullable: true,
    description: 'User ID of the logged in user updating this verification',
  })
  updated_by?: number;

  @Field({
    nullable: true,
    description: 'Timestamp when the record was updated',
  })
  updated_on?: Date;

  // @Field({ nullable: true })
  // recaptcha_token: string;
}
