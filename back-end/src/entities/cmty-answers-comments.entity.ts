import {
    Column,
    CreateDateColumn,
    Entity,
    Generated,
    JoinColumn,
    ManyToMany,
    ManyToOne,
    OneToMany,
    OneToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { Group, UserDetails } from './user-details.entity';
import { CmtyDiscussionsIdeas } from './cmty-discussion-idea.entity';
import { FileAttachments } from './file-attachments.entity';
import { AdminDetails } from './admin-details.entity';
import { CmtyVoteLikesFlags } from './cmty-vote-likes-flags.entity';
export type answersCommentStatus = 'Approved' | 'Flagged' | 'Deleted';

@Entity()
export class CmtyAnswersComments {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'bigint', unique: true })
    @Generated('increment')
    answer_comment_id: number;

    @Column({ type: 'text' })
    answer_comment: string;

    @Column({
        type: 'enum',
        enum: ['Approved', 'Flagged', 'Deleted'],
        default: 'Approved',
    })
    answer_comment_status: answersCommentStatus;

    @Column({ type: 'integer', default: 0 })
    like_count: number;

    @Column({ type: 'integer', default: 0 })
    flag_count: number;

    @ManyToOne(() => CmtyDiscussionsIdeas, (discussionIdea) => discussionIdea.answerComment, {
        nullable: true,
    })
    @JoinColumn({ name: 'disc_idea_id', referencedColumnName: 'discussion_idea_id' })
    discussionIdea: CmtyDiscussionsIdeas;

    @ManyToOne(() => UserDetails, (user) => user.answerComment)
    @JoinColumn({ name: 'author_id', referencedColumnName: 'user_id' })
    author: UserDetails;

    @ManyToOne(() => AdminDetails, (admin) => admin.answerComment)
    @JoinColumn({ name: 'admin_author_id', referencedColumnName: 'admin_id' })
    admin_author: AdminDetails;

    @OneToMany(() => CmtyVoteLikesFlags, (voteLike) => voteLike.answerComment, { nullable: true })
    @JoinColumn({ name: 'vote_id' })
    vote_like_flag?: CmtyVoteLikesFlags[];

    @Column({ type: 'simple-array', nullable: true })
    ans_comm_attachment_ids: string[];

    @ManyToMany(() => FileAttachments, (file) => file.ansCommentDetails, { nullable: true })
    @JoinColumn([{ name: 'ans_comm_attachment', referencedColumnName: 'id' }])
    fileAttachments?: FileAttachments[];

    @Column({ type: 'integer', nullable: true })
    created_by: number;

    @CreateDateColumn({
        type: 'timestamp with time zone',
        default: () => "timezone('utc', now())",
    })
    created_on: Date;

    @Column({ type: 'integer', nullable: true })
    updated_by: number;

    @UpdateDateColumn({
        type: 'timestamp with time zone',
        default: () => "timezone('utc', now())",
    })
    updated_on: Date;

    @Column({
        type: 'enum',
        enum: ['SYSTEM', 'USER', 'ADMIN'],
        default: 'SYSTEM',
        nullable: true,
    })
    created_group: Group;

    @Column({
        type: 'enum',
        enum: ['SYSTEM', 'USER', 'ADMIN'],
        default: 'SYSTEM',
        nullable: true,
    })
    updated_group: Group;
}
