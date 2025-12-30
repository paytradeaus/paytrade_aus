import { CreateActivityLogInput } from './create-activity-log.input';
import { InputType, Field, Int, PartialType } from '@nestjs/graphql';

@InputType({ description: 'Input type for updating an existing activity log.' })
export class UpdateActivityLogInput extends PartialType(
  CreateActivityLogInput,
) {
  @Field(() => Int, { description: 'ID of the activity log to update.' })
  id: number;
}
