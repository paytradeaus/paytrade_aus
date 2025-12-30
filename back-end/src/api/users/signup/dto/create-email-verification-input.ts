import { InputType, Field } from '@nestjs/graphql';
import { Group } from 'src/entities/user-details.entity';

@InputType({
  description:
    'Input payload used to generate or verify email-based verification codes for users or companies.',
})
export class CreateEmailVerificationInput {
  @Field({
    nullable: true,
    description: 'Unique identifier of the user requesting email verification.',
  })
  user_id: number;

  @Field({
    description:
      'First name of the user associated with the email verification.',
  })
  first_name: string;

  @Field({
    nullable: true,
    description:
      'Last name of the user associated with the email verification.',
  })
  last_name: string;

  @Field({
    description: 'Email address to be verified.',
  })
  email_id: string;

  @Field({
    nullable: true,
    description: 'Previously registered email address, if updating email.',
  })
  old_email_id: string;

  @Field({
    nullable: true,
    description: 'Name of the business associated with the email verification.',
  })
  company_name: string;

  @Field({
    nullable: true,
    description: 'Company email address to be verified.',
  })
  company_email_id: string;

  @Field({
    nullable: true,
    description: 'Previously registered business email address, if updating.',
  })
  old_company_email_id: string;

  @Field({
    description: 'Type of email being sent (e.g., verification, update).',
  })
  mail_type: string;

  @Field({
    description: 'Context or category of verification request.',
  })
  type: string;

  @Field({
    nullable: true,
    description: 'Verification code sent to the email address.',
  })
  verification_code: string;

  @Field({
    nullable: true,
    description: 'Expiration timestamp of the verification code.',
  })
  code_expires_in: Date;

  @Field({
    nullable: true,
    description: 'User ID of the logged-in user who created the record.',
  })
  created_by: number;

  @Field({
    nullable: true,
    description: 'Timestamp indicating when the record was created.',
  })
  created_on: Date;

  @Field({
    nullable: true,
    description:
      'Group (User, Admin, System) under which the record is created.',
  })
  created_group: Group;

  @Field({
    nullable: true,
    description: 'User ID of the logged-in user who last updated the record.',
  })
  updated_by: number;

  @Field({
    nullable: true,
    description: 'Timestamp indicating when the record was last updated.',
  })
  updated_on: Date;

  @Field({
    nullable: true,
    description:
      'Group (User, Admin, System) under which the record is updated.',
  })
  updated_group: Group;

  @Field({
    nullable: true,
    description: 'ReCAPTCHA token used to validate the request.',
  })
  recaptcha_token: string;
}
