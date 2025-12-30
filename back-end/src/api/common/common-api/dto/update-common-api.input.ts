import { CreateCommonApiInput } from './create-common-api.input';
import { InputType, Field, Int, PartialType } from '@nestjs/graphql';

@InputType()
export class UpdateCommonApiInput extends PartialType(CreateCommonApiInput) {
  @Field(() => Int)
  id: number;
}
