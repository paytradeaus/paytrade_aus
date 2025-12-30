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
import { MasterTypes } from './master-types.entity';
import { FileAttachments } from './file-attachments.entity';
import { Group, UserDetails } from './user-details.entity';
import { CmtyAnswersComments } from './cmty-answers-comments.entity';
import { AdminDetails } from './admin-details.entity';
import { CmtyVoteLikesFlags } from './cmty-vote-likes-flags.entity';
export type cmtyType = 'Discussion' | 'Idea';
export type discIdeaStatus = 'Draft' | 'Active' | 'Flagged' | 'Deleted';

@Entity()
export class CmtyDiscussionsIdeas {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'bigint', unique: true })
  @Generated('increment')
  discussion_idea_id: number;

  @Column({ type: 'text', unique: true })
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({
    type: 'enum',
    enum: ['Discussion', 'Idea'],
    default: 'Discussion',
  })
  cmty_content_type: cmtyType;

  @Column({ default: true, nullable: true })
  enable_comments: boolean;

  // @Column({ type: 'varchar', nullable: true })
  // urlSlug: string;


  @Column({
    type: 'enum',
    enum: ['Draft', 'Active', 'Flagged', 'Deleted'],
    default: 'Draft',
  })
  discussion_idea_status: discIdeaStatus;

  @Column({ type: 'integer', default: 0 })
  vote_count: number;

  @Column({ type: 'integer', default: 0 })
  like_count: number;

  @Column({ type: 'integer', default: 0 })
  flag_count: number;

  @Column({ type: 'integer', default: 0 })
  view_count: number;

  @Column({ type: 'integer', default: 0 })
  answer_comment_count: number;

  @ManyToOne(() => UserDetails, (user) => user.discussionIdea)
  @JoinColumn({ name: 'author_id', referencedColumnName: 'user_id' })
  author: UserDetails;

  @ManyToOne(() => AdminDetails, (admin) => admin.discussionIdea)
  @JoinColumn({ name: 'admin_author_id', referencedColumnName: 'admin_id' })
  admin_author: AdminDetails;

  @ManyToOne(() => MasterTypes, (masterType) => masterType.discussionIdea, {
    nullable: true,
  })
  @JoinColumn({ name: 'category_id' })
  category: MasterTypes;

  @OneToMany(() => CmtyAnswersComments, (answersComment) => answersComment.discussionIdea, {
    nullable: true,
  })
  answerComment?: CmtyAnswersComments[];

  @OneToMany(() => CmtyVoteLikesFlags, (voteLike) => voteLike.discussionIdea, {
    nullable: true,
  })
  vote_like_flag?: CmtyVoteLikesFlags[];

  @Column({ type: 'simple-array', nullable: true })
  disc_idea_attachment_ids: string[];

  @ManyToMany(() => FileAttachments, (file) => file.discIdeaDetails, {
    nullable: true,
  })
  @JoinColumn([{ name: 'disc_idea_attachment_ids',  referencedColumnName: 'id' }])
  fileAttachments?: FileAttachments[];

  @Column({ 
    type: 'timestamp with time zone',
    default: () => "timezone('utc', now())",
  })
  edited_on: Date;

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
