import { ObjectType, Field } from '@nestjs/graphql';
import { UserMode } from 'src/libs/@paytrade-types/paytrade-types';
import { ApiStatusType } from 'src/libs/@response-framer/response-framer';

@ObjectType({
  description: 'Represents the current mode of a user within the system.',
})
export class FetchModeOfAnUser {
  @Field({ description: 'Unique identifier of the user.' })
  user_id: number;

  @Field({
    description:
      'Mode of the user, e.g., Admin, User, or any custom mode defined in UserMode enum.',
  })
  user_mode: UserMode;
}

@ObjectType({ description: `Response returned after switching a user's mode.` })
export class SwitchUserModeResponse {
  @Field({ description: 'Status of the API call, e.g., SUCCESS or ERROR.' })
  status: ApiStatusType;

  @Field({
    description:
      'Human-readable message describing the result of the operation.',
  })
  message: string;

  @Field({
    nullable: true,
    description: 'Optional data, e.g., confirmation or mode information.',
  })
  data: string;
}

@ObjectType({
  description: 'Response returned when fetching the current mode of a user.',
})
export class FetchModeOfAnUserResponse {
  @Field({ description: 'Status of the API call, e.g., SUCCESS or ERROR.' })
  status: ApiStatusType;

  @Field({
    description:
      'Human-readable message describing the result of the operation.',
  })
  message: string;

  @Field({
    nullable: true,
    description: `Contains the user's current mode details if successful.`,
  })
  data: FetchModeOfAnUser;
}
