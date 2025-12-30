import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    OneToMany,
    OneToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { Group, UserDetails } from './user-details.entity';
import { CmtyDiscussionsIdeas } from './cmty-discussion-idea.entity';
import { AdminDetails } from './admin-details.entity';
import { CmtyAnswersComments } from './cmty-answers-comments.entity';

export type reactionType = 'Vote' | 'Like' | 'Flag' | 'None';
export type flagType = 'Inappropriate' | 'Spam';

@Entity()
export class CmtyVoteLikesFlags {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({
        type: 'enum',
        enum: ['Vote', 'Like', 'Flag', 'None'],
        default: 'None',
    })
    reaction_type: reactionType;

    @Column({
        type: 'enum',
        enum: ['Inappropriate', 'Spam'],
        nullable: true,
      })
    cmty_flag_type: flagType;

    @Column({ type: 'text', nullable: true })
    flag_reason: string;

    @ManyToOne(() => CmtyDiscussionsIdeas, (discussionIdea) => discussionIdea.vote_like_flag, { nullable: true })
    @JoinColumn({ name: 'disc_idea_id',  referencedColumnName: 'discussion_idea_id' })
    discussionIdea: CmtyDiscussionsIdeas;

    @ManyToOne(() => CmtyAnswersComments, (answerComment) => answerComment.vote_like_flag, { nullable: true })
    @JoinColumn({ name: 'ans_comment_id',  referencedColumnName: 'answer_comment_id' })
    answerComment: CmtyAnswersComments;

    @ManyToOne(() => UserDetails, (user) => user.CmtyVoteLikeFlags, { nullable: true })
    @JoinColumn({ name: 'author_id', referencedColumnName: 'user_id' })
    voter_liked_flagged: UserDetails;

    @ManyToOne(() => AdminDetails, (admin) => admin.CmtyVoteLikeFlags, { nullable: true })
    @JoinColumn({ name: 'admin_author_id', referencedColumnName: 'admin_id' })
    admin_voter_liked_flagged: AdminDetails;

    @Column({ type: 'integer', nullable: true })
    created_by: number;

    @CreateDateColumn({
        type: 'timestamp with time zone',
        default: () => "timezone('utc', now())",
    })
    created_on: Date;

    @Column({
        type: 'enum',
        enum: ['SYSTEM', 'USER', 'ADMIN'],
        default: 'SYSTEM',
        nullable: true,
    })
    created_group: Group;
}
