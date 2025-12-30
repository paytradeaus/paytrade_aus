import { ObjectType, Field } from '@nestjs/graphql';
@ObjectType({ description: 'Detailed information for a specific system email' })
export class FetchDetailsOfASystemEmail {
  @Field({ description: 'Unique identifier of the email' })
  id: string;

  @Field({ description: 'ID of the sender of the email' })
  emailFromId: string;

  @Field({ nullable: true, description: 'Subject of the email' })
  subject: string;

  @Field({ nullable: true, description: 'Body/content of the email' })
  body: string;

  @Field({ nullable: true, description: 'Type/category of the email' })
  type: string;

  @Field(() => [String], {
    nullable: true,
    description: 'List of primary recipients',
  })
  toEmails: string[];

  @Field(() => [String], {
    nullable: true,
    description: 'List of CC recipients',
  })
  emailCcIds: string[];

  @Field(() => [FileAttachmentDetailsResponse], {
    description: 'Attachments associated with the email',
  })
  attachments: FileAttachmentDetailsResponse[];

  @Field({ description: 'Current status of the email (e.g., SENT, FAILED)' })
  status: string;

  @Field({ description: 'Timestamp when the email record was created' })
  created_on: Date;

  @Field({ description: 'ID of the user who created the email record' })
  created_by: string;
}

@ObjectType({
  description: 'Represents a single file attachment for a system email',
})
export class FileAttachmentDetailsResponse {
  @Field({ description: 'Unique identifier of the attachment' })
  id: string;

  @Field({ description: 'Base64 string or URL of the attachment image/file' })
  attachmentImage: string;

  @Field({
    nullable: true,
    description: 'ID of the user who uploaded the attachment',
  })
  user_id: number;

  @Field({
    nullable: true,
    description: 'Company ID associated with the attachment',
  })
  company_id: string;

  @Field({ description: 'Type of attachment (e.g., document, image, pdf)' })
  attachment_type: string;

  @Field({ description: 'Original name of the file' })
  file_name: string;

  @Field({ description: 'Path or storage location of the file' })
  file_path: string;

  @Field({ description: 'File MIME type (e.g., image/png, application/pdf)' })
  file_type: string;
}

@ObjectType({ description: 'Response wrapper for a list of system emails' })
export class FetchAllSystemEmailsListResponse {
  @Field(() => [FetchAllSystemEmails], {
    nullable: true,
    description: 'List of system emails',
  })
  emails_list: FetchAllSystemEmails[];

  @Field({ description: 'Total number of emails matching the query' })
  total_count: Number;
}

@ObjectType({ description: 'Represents a single system email in a list' })
export class FetchAllSystemEmails {
  @Field({ description: 'Unique identifier of the email' })
  id: string;

  @Field({ description: 'ID of the sender of the email' })
  emailFromId: string;

  @Field({ nullable: true, description: 'Subject of the email' })
  subject: string;

  @Field({ nullable: true, description: 'Body/content of the email' })
  body: string;

  @Field({ nullable: true, description: 'Type/category of the email' })
  type: string;

  @Field(() => [String], {
    nullable: true,
    description: 'List of primary recipients',
  })
  toEmails: string[];

  @Field(() => [String], {
    nullable: true,
    description: 'List of CC recipients',
  })
  emailCcIds: string[];

  @Field({
    description: 'Current status of the email',
    deprecationReason: 'Use enum values SUCCESS or FAILED',
  })
  status: 'SUCCESS' | 'FAILED';

  @Field({ description: 'Timestamp when the email record was created' })
  created_on: Date;

  @Field({ description: 'ID of the user who created the email record' })
  created_by: string;
}

@ObjectType({ description: 'Minimal response for sending a system email' })
export class SystemEmailResponse {
  @Field({ description: 'Unique identifier of the created email' })
  id: string;

  @Field({ description: 'Current status of the email' })
  status: string;
}

@ObjectType({ description: 'Response for sending a system email' })
export class SendSystemEmailResponse {
  @Field({ description: 'Status of the API call (e.g., SUCCESS or FAILED)' })
  status: string;

  @Field({ description: 'Additional message from the API' })
  message: string;

  @Field({ nullable: true, description: 'Details of the created system email' })
  data: SystemEmailResponse;
}

@ObjectType({
  description: 'Response wrapper for fetching details of a system email',
})
export class FetchDetailsOfASystemEmailResponse {
  @Field({ description: 'Status of the API call' })
  status: string;

  @Field({ description: 'Message associated with the API response' })
  message: string;

  @Field({ nullable: true, description: 'Detailed email data' })
  data?: FetchDetailsOfASystemEmail;
}

@ObjectType({ description: 'Response wrapper for fetching all system emails' })
export class FetchAllSystemEmailsResponse {
  @Field({ description: 'Status of the API call' })
  status: string;

  @Field({ description: 'Message associated with the API response' })
  message: string;

  @Field(() => FetchAllSystemEmailsListResponse, {
    nullable: true,
    description: 'List of all system emails with count',
  })
  data?: FetchAllSystemEmailsListResponse;
}
