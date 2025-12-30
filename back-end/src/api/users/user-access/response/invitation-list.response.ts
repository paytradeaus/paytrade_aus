import { ObjectType, Field } from '@nestjs/graphql';
import { InvitationResponse } from './invitation.response';

@ObjectType({
  description:
    'Represents the list of invitations associated with a business or user.',
})
export class InvitationListRes {
  @Field(() => [InvitationResponse], {
    nullable: true,
    description:
      'Array of invitation objects containing details about each invitation. Can be null if there are no invitations.',
  })
  invitation_list: InvitationResponse[];

  @Field({ description: 'Total number of invitations in the list.' })
  total_count: number;
}

@ObjectType({
  description: 'GraphQL response wrapper for fetching the list of invitations.',
})
export class InvitationListResponse {
  @Field({ description: 'Status of the request, e.g., SUCCESS or ERROR.' })
  status: string;

  @Field({ description: 'Message describing the result of the request.' })
  message: string;

  @Field({
    nullable: true,
    description:
      'Data containing the list of invitations and total count. Nullable if request failed or no invitations exist.',
  })
  data?: InvitationListRes;
}
