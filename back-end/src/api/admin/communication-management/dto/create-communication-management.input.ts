import { InputType, Int, Field } from '@nestjs/graphql';

@InputType({ description: 'Input for sending a system email' })
export class SendSystemEmailInput {
  @Field({ description: 'ID of the email sender' })
  emailFromId: string;

  @Field(() => [String], { description: 'List of recipient email addresses' })
  toEmails: string[];

  @Field(() => [String], { description: "List of email IDs to be CC'd" })
  emailCcIds: string[];

  @Field({ nullable: true, description: 'Subject of the email' })
  subject: string;

  @Field({ nullable: true, description: 'Body content of the email' })
  body: string;

  @Field({
    nullable: true,
    description: 'Type of email, e.g., notification or alert',
  })
  type: string;

  @Field(() => [String], {
    nullable: true,
    description: 'List of attachment IDs associated with the email',
  })
  attachmentIds: string[];
}

@InputType({ description: 'Input to fetch details of a specific system email' })
export class FetchDetailsOfASystemEmailInput {
  @Field({ description: 'ID of the system email to fetch details for' })
  id: string;
}
