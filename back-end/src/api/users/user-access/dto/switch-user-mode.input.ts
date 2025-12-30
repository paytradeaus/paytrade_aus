import { InputType, Field } from '@nestjs/graphql';
import { UserMode } from 'src/libs/@paytrade-types/paytrade-types';

@InputType({
  description:
    'Input type used to switch the mode of a user within a specific business.',
})
export class SwitchModeOfAnUserInput {
  @Field({
    description: 'Unique identifier of the user whose mode is being switched.',
  })
  user_id: number;

  @Field({
    description: 'Unique identifier of the business where the user belongs.',
  })
  company_id: number;

  @Field({
    description:
      'The mode to switch the user to. Should match one of the allowed UserMode values (Onboarding or Normal).',
  })
  user_mode: UserMode;
}

@InputType({
  description: 'Input type used to fetch the current mode of a user.',
})
export class FetchModeOfAnUserInput {
  @Field({
    description:
      'Unique identifier of the user whose current mode is being queried.',
  })
  user_id: number;
}
