import { Field, ObjectType } from '@nestjs/graphql';
import {
  flagType,
  reactionType,
} from 'src/entities/cmty-vote-likes-flags.entity';

@ObjectType({
  description:
    'Represents a vote, like, or flag on a discussion idea or answer comment.',
})
export class voteLikeFlag {
  @Field({
    nullable: true,
    description: 'Unique identifier of the vote/like/flag record.',
  })
  id?: string;

  @Field({
    nullable: true,
    description: 'ID of the discussion idea this vote/flag belongs to.',
  })
  discussion_idea_id?: number;

  @Field({
    nullable: true,
    description:
      'ID of the answer comment this vote/flag belongs to, if applicable.',
  })
  answer_comment_id?: number;

  @Field({ nullable: true, description: 'Type of reaction: like, vote, etc.' })
  reaction_type?: reactionType;

  @Field({ nullable: true, description: 'Type of flag if applicable.' })
  cmty_flag_type?: flagType;

  @Field({
    nullable: true,
    description: 'Reason provided for the flag, if any.',
  })
  flag_reason?: string;
}

@ObjectType({
  description:
    'Response object returned after creating or fetching a vote/like/flag.',
})
export class voteLikeFlagResponse {
  @Field({ description: 'Status of the request.' })
  status: string;

  @Field({ description: 'Message describing the result of the request.' })
  message: string;

  @Field(() => voteLikeFlag, {
    nullable: true,
    description: 'The vote/like/flag record affected or retrieved.',
  })
  data?: voteLikeFlag;
}
