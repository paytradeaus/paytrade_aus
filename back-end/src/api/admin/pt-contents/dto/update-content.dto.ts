import { InputType, Field } from '@nestjs/graphql';

@InputType({ description: 'Input type to update an existing content block' })
export class UpdateContentInput {
  @Field({ description: 'Unique ID of the content block to update' })
  id: string;

  @Field({
    nullable: true,
    description: 'Type of the page where the content is located',
  })
  pageType?: string;

  @Field({ nullable: true, description: 'Heading/title of the content block' })
  heading?: string;

  @Field({ nullable: true, description: 'Body/text of the content block' })
  body?: string;

  @Field({
    nullable: true,
    description: 'Status of the content block (active/inactive)',
  })
  status?: boolean;
}
