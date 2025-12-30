import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType({
  description: 'Generic response for settings-related operations.',
})
export class SettingsResponse {
  @Field({ description: 'Status of the API response.' })
  status: string;

  @Field({ description: 'Message describing the result of the operation.' })
  message: string;

  @Field(() => Number, {
    nullable: true,
    description: 'Settings value or identifier returned by the operation.',
  })
  data?: number;
}
