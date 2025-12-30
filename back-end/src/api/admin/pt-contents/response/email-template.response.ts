import { Field, ObjectType } from '@nestjs/graphql';
import { GraphQLString } from 'graphql';
import { emailCategory } from 'src/entities/email-templates.entity';

@ObjectType({ description: 'Represents a mail template.' })
export class ptMailTemplate {
  @Field({ description: 'Unique identifier of the mail template.' })
  id: string;

  @Field({ description: 'Subject line of the email template.' })
  email_subject: string;

  @Field(() => GraphQLString, {
    description: 'HTML or text content of the email template.',
  })
  email_content: string;

  @Field({
    description:
      'Timestamp indicating when the mail template was last updated.',
  })
  updated_on: Date;

  @Field({ nullable: true, description: 'Category of the email template.' })
  category: emailCategory;

  @Field(() => [String], {
    nullable: true,
    description: 'List of dynamic placeholders available in this template.',
  })
  available_dynamic?: string[];

  @Field(() => [String], {
    nullable: true,
    description:
      'List of dynamic placeholders currently selected for use in this template.',
  })
  selected_dynamic?: string[];
}

@ObjectType({ description: 'Response object for a single mail template.' })
export class ptMailTemplateResponse {
  @Field({ description: 'Response status (e.g., SUCCESS, FAILED).' })
  status: string;

  @Field({ description: 'Response message providing additional context.' })
  message: string;

  @Field({ nullable: true, description: 'Data containing the mail template.' })
  data?: ptMailTemplate;
}
