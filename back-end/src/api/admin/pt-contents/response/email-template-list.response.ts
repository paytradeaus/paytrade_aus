import { ObjectType, Field, Int } from '@nestjs/graphql';
import { ptMailTemplate } from './email-template.response';

@ObjectType({ description: 'Represents a list of mail templates.' })
export class ptMailTemplateList {
  @Field(() => [ptMailTemplate], { description: 'Array of mail templates.' })
  mailTemplates: ptMailTemplate[];

  @Field(() => Int, {
    description: 'Total number of mail templates available.',
  })
  totalCount: number;
}

@ObjectType({
  description: 'Response object for fetching a list of mail templates.',
})
export class ptMailTemplateListResponse {
  @Field({ description: 'Response status (e.g., SUCCESS, FAILED).' })
  status: string;

  @Field({ description: 'Response message providing additional context.' })
  message: string;

  @Field({
    nullable: true,
    description: 'Data containing the list of mail templates.',
  })
  data?: ptMailTemplateList;
}
