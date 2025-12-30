import { InputType, Field } from '@nestjs/graphql';

@InputType({
  description:
    'Input for triggering an activity log when switching business profiles.',
})
export class TriggerActivityLogWhileSwitchingBusinessProfileInput {
  @Field({
    description:
      'The ID of the business for which the business profile is being switched.',
  })
  company_id: number;
}
