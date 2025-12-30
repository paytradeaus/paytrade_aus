import { InputType, Int, Field } from '@nestjs/graphql';

@InputType({ description: 'Input data for creating a file upload record.' })
export class CreateFileUploadInput {
  @Field({ nullable: true, description: 'Original name of the file.' })
  name?: string;

  @Field({ nullable: true, description: 'ID of the user uploading the file.' })
  user_id?: number;

  @Field({
    nullable: true,
    description: 'ID of the admin associated with the file upload.',
  })
  admin_id?: number;

  @Field({
    nullable: true,
    description: 'ID of the business associated with the file.',
  })
  company_id?: number;

  @Field({
    nullable: true,
    description: 'ID of the bank account associated with the file.',
  })
  bank_account_id?: number;

  @Field({
    nullable: true,
    description: 'ID of the blog/res record associated with the file.',
  })
  blog_res_id?: string;

  @Field({
    nullable: true,
    description: 'ID of the contract associated with the file.',
  })
  contract_id?: number;

  @Field({
    nullable: true,
    description: 'ID of the variation associated with the file.',
  })
  variation_id?: number;

  @Field({
    nullable: true,
    description: 'ID of the notice template associated with the file.',
  })
  notice_template_id?: number;

  @Field({
    nullable: true,
    description: 'ID of the notice associated with the file.',
  })
  notice_id?: number;

  @Field({
    nullable: true,
    description: 'ID of the payment associated with the file.',
  })
  payment_id?: number;

  @Field({
    nullable: true,
    description: 'ID of the payment claim associated with the file.',
  })
  payment_claim_id?: number;

  @Field({
    nullable: true,
    description: 'ID of the audit record associated with the file.',
  })
  audit_id?: number;

  @Field({
    nullable: true,
    description: 'ID of the discussion idea associated with the file.',
  })
  discussion_idea_id?: number;

  @Field({
    nullable: true,
    description: 'ID of the answer comment associated with the file.',
  })
  answer_comment_id?: number;

  @Field({
    nullable: true,
    description: 'File storage path on the server or cloud.',
  })
  file_path?: string;

  @Field({ nullable: true, description: 'Name of the file as stored.' })
  file_name?: string;

  @Field({
    nullable: true,
    description: 'Type/extension of the file (e.g., pdf, jpg).',
  })
  file_type?: string;

  @Field({
    description:
      'Type of attachment (e.g., supporting document, notice, etc.).',
  })
  attachment_type: string;

  @Field({
    description: 'Username or identifier of the person who uploaded the file.',
  })
  uploaded_by: string;

  @Field({
    nullable: true,
    description: 'Date and time when the file was uploaded.',
  })
  uploaded_on?: Date;

  @Field({ nullable: true, description: 'Optional custom name for the file.' })
  custom_file_name?: string;
}
