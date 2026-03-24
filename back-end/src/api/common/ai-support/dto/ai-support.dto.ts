import { Field, InputType, Int } from '@nestjs/graphql';

@InputType()
export class AskAiSupportInput {
  @Field()
  question: string;
}

@InputType()
export class SearchSupportInput {
  @Field()
  query: string;

  @Field(() => Int, { nullable: true, defaultValue: 1 })
  page: number;

  @Field(() => Int, { nullable: true, defaultValue: 10 })
  perPage: number;
}
