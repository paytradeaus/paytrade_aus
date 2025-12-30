import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Generated,
  AfterInsert,
  ManyToOne,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import { Role } from '../api/auth/role-guard/role.enum';
import { AdminGroup } from './admin-group.entity';
import { BlogResource } from './admin-blogs-resources.entity';
import { Group } from './user-details.entity';
import { SignatureType } from './subscription-details.entity';
import { FileAttachments } from './file-attachments.entity';
import { ActivityLogNew } from './activity-log-new.entity';
import { CmtyDiscussionsIdeas } from './cmty-discussion-idea.entity';
import { CmtyAnswersComments } from './cmty-answers-comments.entity';
import { CmtyVoteLikesFlags } from './cmty-vote-likes-flags.entity';
export type AdminStatus = 'Active' | 'Inactive' | 'Deleted';
// export type sigType = 'IMAGE' | 'CANVAS' | 'NIL';

@Entity()
export class AdminDetails {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'integer', unique: true })
  @Generated('increment')
  admin_id: number;

  @Column({ type: 'varchar', length: 100 })
  first_name: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  last_name: string;

  @Column({ type: 'varchar', length: 100 })
  email_id: string;

  @Column({
    type: 'enum',
    enum: ['Active', 'Inactive', 'Deleted'],
    default: 'Active',
  })
  admin_status: AdminStatus;

  @Column({
    type: 'enum',
    enum: Role,
    default: Role.RESTRICTED_PORTAL_ADMIN,
  })
  admin_role: Role;

  @Column({ type: 'varchar', length: 100, nullable: true })
  password: string;

  @Column({ type: 'text', nullable: true })
  signature: string;

  @Column({
    type: 'enum',
    enum: ['IMAGE', 'CANVAS'],
    nullable: true,
  })
  signature_type: SignatureType;

  @Column({ type: 'varchar', length: 100, nullable: true })
  logged_in_email_id: string;

  @Column({ type: 'timestamp with time zone', nullable: true })
  last_logged_in: Date;

  @Column({ type: 'text', nullable: true })
  user_timezone: string;

  @Column({ nullable: true })
  profile_id: string;

  @ManyToOne((type) => FileAttachments)
  @JoinColumn([{ name: 'profile_id', referencedColumnName: 'id' }])
  fileAttachments: FileAttachments;

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

  @OneToMany(() => AdminGroup, (admin) => admin.adminDetails)
  adminDetailsGroup: AdminGroup[];

  @OneToMany(() => BlogResource, (blog) => blog.author)
  blogs: BlogResource[];

  @OneToMany(
    () => CmtyDiscussionsIdeas,
    (discussionIdea) => discussionIdea.admin_author,
  )
  discussionIdea: CmtyDiscussionsIdeas[];

  @OneToMany(
    () => CmtyAnswersComments,
    (answerComment) => answerComment.admin_author,
  )
  answerComment: CmtyAnswersComments[];

  @OneToMany(
    () => CmtyVoteLikesFlags,
    (voteLike) => voteLike.admin_voter_liked_flagged,
  )
  CmtyVoteLikeFlags: CmtyVoteLikesFlags;

  @OneToMany(() => ActivityLogNew, (admin) => admin.adminDetails)
  activityLogNew: ActivityLogNew[];

  @AfterInsert()
  updateUserId() {
    console.log(this.admin_id);
  }
}
