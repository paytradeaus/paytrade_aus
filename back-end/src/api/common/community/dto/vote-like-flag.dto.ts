import { InputType, Field } from '@nestjs/graphql';
import {
  flagType,
  reactionType,
} from 'src/entities/cmty-vote-likes-flags.entity';

@InputType({
  description:
    'Input type to like, vote, or flag a discussion idea or an answer comment.',
})
export class VoteLikeFlagInput {
  @Field({
    nullable: true,
    description: 'ID of the discussion idea being reacted to.',
  })
  discussion_idea_id?: number;

  @Field({
    nullable: true,
    description: 'ID of the answer comment being reacted to.',
  })
  answer_comment_id?: number;

  @Field({
    description:
      'Type of reaction, e.g., like, dislike, or other defined reaction types.',
  })
  reaction_type: reactionType;

  @Field({
    nullable: true,
    description: 'Type of community flag if flagging the content.',
  })
  cmty_flag_type?: flagType;

  @Field({ nullable: true, description: 'Reason for flagging the content.' })
  flag_reason?: string;
}
