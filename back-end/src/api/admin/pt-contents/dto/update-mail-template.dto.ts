import { InputType, Field } from '@nestjs/graphql';

@InputType({ description: 'Input type to update an existing mail template' })
export class UpdateMailTemplateInput {
  @Field({ description: 'Unique ID of the mail template' })
  id: string;

  @Field({ nullable: true, description: 'Type of the email template' })
  email_type?: string;

  @Field({ nullable: true, description: 'Subject line of the email' })
  email_subject?: string;

  @Field({ nullable: true, description: 'Body/content of the email template' })
  email_content?: string;

  @Field({
    nullable: true,
    description: 'Category ID associated with the template',
  })
  categoryId?: string;

  @Field(() => [String], {
    nullable: true,
    description: 'List of dynamic fields used in the template',
  })
  selected_dynamic?: string[];
}
