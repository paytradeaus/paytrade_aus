import { InputType, Int, Field } from '@nestjs/graphql';

@InputType()
export class CreateCommonApiInput {
  @Field(() => Int, { description: 'Example field (placeholder)' })
  exampleField: number;
}
