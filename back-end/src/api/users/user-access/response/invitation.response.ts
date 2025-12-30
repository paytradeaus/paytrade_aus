import { ObjectType, Field } from '@nestjs/graphql';
import { UserAction } from 'src/entities/invitations.entity';

@ObjectType({
  description:
    'Represents a single invitation sent to a user within a business context.',
})
export class InvitationResponse {
  @Field({
    nullable: true,
    description: 'Unique identifier of the invitation.',
  })
  id: string;

  @Field({ nullable: true, description: 'Name of the invited user.' })
  user_name: string;

  @Field({ nullable: true, description: 'Email address of the invited user.' })
  email_id: string;

  @Field({
    nullable: true,
    description:
      'The action taken by the user regarding the invitation (e.g., Accepted, Declined, Pending).',
  })
  user_action: UserAction;

  @Field({
    nullable: true,
    description: 'Number of times the invitation was declined by the user.',
  })
  decline_count: number;

  @Field({
    nullable: true,
    description: 'Indicates if the invitation was requested by an admin.',
  })
  is_admin_requested: boolean;

  @Field({
    nullable: true,
    description: 'Name of the person who requested or sent the invitation.',
  })
  requested_by: string;

  @Field({ nullable: true, description: 'Unique ID of the invited user.' })
  user_id: number;

  @Field({
    nullable: true,
    description: 'Unique ID of the business associated with the invitation.',
  })
  company_id: number;

  @Field({
    nullable: true,
    description: 'Name of the business associated with the invitation.',
  })
  company_name: string;

  @Field({
    nullable: true,
    description: 'Name of the admin who sent the invitation.',
  })
  admin_name: string;

  @Field({
    nullable: true,
    description: 'Email of the admin who sent the invitation.',
  })
  admin_email: string;
}
