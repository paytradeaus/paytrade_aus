import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Generated,
  CreateDateColumn,
  UpdateDateColumn,
  AfterInsert,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Role } from '../api/auth/role-guard/role.enum';
import { FileAttachments } from './file-attachments.entity';
import { CompanyUserRoles } from './company-user-roles.entity';
import { Invitations } from './invitations.entity';
import { UserMode } from 'src/libs/@paytrade-types/paytrade-types';
import { ActivityLogNew } from './activity-log-new.entity';
import { CmtyDiscussionsIdeas } from './cmty-discussion-idea.entity';
import { CmtyAnswersComments } from './cmty-answers-comments.entity';
import { CmtyVoteLikesFlags } from './cmty-vote-likes-flags.entity';
export type UserStatus =
  | 'Active'
  | 'Inactive'
  | 'Pending'
  | 'Blocked'
  | 'Archived'
  | 'Deleted';

export type Group = 'SYSTEM' | 'USER' | 'ADMIN';

// Allowlist of recognised personal email-preference keys.
// Boolean toggles default to opted-IN: missing/null is treated the same as
// `true`. Only an explicit `false` opts the user out. The matching gating
// queries (community / compliance / xero daily cron) all use
// `IS DISTINCT FROM 'false'` so that default-on behaviour survives users
// who were created before a key existed and never touched their prefs.
//
// `xero_sync_failures_mode` is a string sub-setting that pairs with the
// `xero_sync_failures` master switch and accepts either 'immediate' or
// 'daily' (default). Legacy users whose stored prefs have only
// `xero_sync_failures: true` are treated as on + daily.
export const UserEmailPreferences = [
  'community',
  'compliance',
  'notices',
  'xero_sync_failures',
  'xero_sync_failures_mode',
];

// Keys that follow the boolean opt-IN-by-default convention. These are
// normalised to `true` whenever the stored JSON has no entry / null.
export const UserDefaultOnEmailPreferenceKeys = [
  'community',
  'compliance',
  'notices',
  'xero_sync_failures',
];

export type XeroSyncFailuresMode = 'immediate' | 'daily';

export const DefaultUserEmailPreferences: Record<string, any> = {
  community: true,
  compliance: true,
  notices: true,
  xero_sync_failures: true,
  xero_sync_failures_mode: 'daily',
};

@Entity()
export class UserDetails {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'integer', unique: true })
  @Generated('increment')
  user_id: number;

  @Column({ type: 'varchar', length: 100 })
  first_name: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  last_name: string;

  @Column({ type: 'date', nullable: true })
  date_of_birth: Date;

  @Column({ type: 'varchar', length: 100 })
  email_id: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  occupation: string;

  @Column({ type: 'varchar', length: 100 })
  position_title: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  company_name: string;

  @Column({ type: 'text' })
  place_id: string;

  @Column({ type: 'varchar', length: 200 })
  user_address: string;

  @Column({ type: 'varchar', length: 50 })
  country: string;

  @Column({ type: 'varchar', length: 50 })
  region: string;

  @Column({ type: 'varchar', length: 50 })
  latitude: string;

  @Column({ type: 'varchar', length: 50 })
  longitude: string;

  @Column({ type: 'varchar', length: 20 })
  user_phone_no: string;

  @Column({
    type: 'enum',
    enum: ['Active', 'Inactive', 'Pending', 'Blocked', 'Archived', 'Deleted'],
    default: 'Pending',
    nullable: true,
  })
  user_status: UserStatus;

  @Column({
    type: 'enum',
    enum: Role,
    default: Role.BASIC_USER,
    nullable: true,
  })
  user_role: Role;

  @Column({ default: false, nullable: true })
  is_verified: Boolean;

  @Column({ default: false, nullable: true })
  is_admin_added: Boolean;

  @Column({ type: 'varchar', length: 100, nullable: true })
  password: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  logged_in_email_id: string;

  @Column({ type: 'timestamp with time zone', nullable: true })
  last_logged_in: Date;

  @Column({ default: false })
  is_admin_contacted: Boolean;

  @Column({ nullable: true })
  profile_id: string;

  @ManyToOne((type) => FileAttachments)
  @JoinColumn([{ name: 'profile_id', referencedColumnName: 'id' }])
  fileAttachments: FileAttachments;

  @Column({
    type: 'enum',
    enum: ['Onboarding', 'Normal'],
    default: 'Normal',
    nullable: true,
  })
  user_mode: UserMode;

  @Column({ type: 'text', nullable: true })
  user_timezone: string;

  @Column({ default: 0 })
  failed_attempts: number;

  @Column({ type: 'timestamp with time zone', nullable: true })
  lock_time: Date;

  @Column({ default: true })
  show_popup: Boolean;

  @Column({ default: false })
  is_bot: boolean;

  @Column({ default: 0 })
  first_time_logged_in: number;

  @Column({ type: 'json', nullable: true })
  email_preferences: Record<string, any>;

  @Column({ default: false })
  ai_live_follow_enabled: boolean;

  @Column({ type: 'timestamp with time zone', nullable: true })
  ai_live_follow_enabled_at: Date;

  @Column({ type: 'json', nullable: true })
  ui_preferences: Record<string, any>;

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

  @OneToMany(() => CompanyUserRoles, (user) => user.userDetails)
  companyRoles: CompanyUserRoles[];

  @OneToMany(() => ActivityLogNew, (user) => user.userDetails)
  activityLogNew: ActivityLogNew[];

  @OneToMany(() => CmtyDiscussionsIdeas, (user) => user.author)
  discussionIdea: CmtyDiscussionsIdeas[];

  @OneToMany(() => CmtyAnswersComments, (user) => user.author)
  answerComment: CmtyAnswersComments[];

  @OneToMany(() => CmtyVoteLikesFlags, (user) => user.voter_liked_flagged)
  CmtyVoteLikeFlags: CmtyVoteLikesFlags[];

  @OneToMany(() => Invitations, (user) => user.userDetails)
  invitations: Invitations[];

  @AfterInsert()
  updateUserId() {
    console.log(this.user_id);
  }
}
