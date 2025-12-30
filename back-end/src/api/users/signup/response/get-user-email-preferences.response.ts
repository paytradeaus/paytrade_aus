import { Field, ObjectType } from '@nestjs/graphql';
import { StringResponse } from './auth.response';
import { GraphQLJSONObject } from 'graphql-type-json';

@ObjectType({ description: `Represents a user's email preferences detail.` })
class UserEmailPreferenceDetail {
  @Field({ description: 'Unique identifier of the user.' })
  user_id: number;

  @Field(() => GraphQLJSONObject, {
    description: `A JSON object representing the user's email preferences. Each key is the type of email notification, and the value is a boolean indicating whether the user has opted in or out.`,
  })
  email_preferences: Record<string, boolean>;
}

@ObjectType({
  description: `Response object containing a user's email preferences along with status and message.`,
})
export class GetUserEmailPreferenceResponse extends StringResponse {
  @Field({ nullable: true, description: 'User email preference details.' })
  data: UserEmailPreferenceDetail;
}
