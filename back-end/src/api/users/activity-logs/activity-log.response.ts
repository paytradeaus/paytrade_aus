import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType({
  description:
    'Response returned after triggering an activity log when switching a business profile.',
})
export class TriggerActivityLogWhileSwitchingBusinessProfileResponse {
  @Field({ description: 'Status of the operation, either SUCCESS or FAILED.' })
  status: 'SUCCESS' | 'FAILED';

  @Field({
    description:
      'A message providing additional information about the operation.',
  })
  message: string;

  @Field({
    nullable: true,
    description: 'Optional data returned by the operation.',
  })
  data?: string;
}

@ObjectType({
  description:
    'Response returned after triggering an activity log when a user is signed out.',
})
export class TriggerActivityLogAfterAnUserIsSignedOutResponse {
  @Field({ description: 'Status of the operation, either SUCCESS or FAILED.' })
  status: 'SUCCESS' | 'FAILED';

  @Field({
    description:
      'A message providing additional information about the operation.',
  })
  message: string;

  @Field({
    nullable: true,
    description: 'Optional data returned by the operation.',
  })
  data?: string;
}
