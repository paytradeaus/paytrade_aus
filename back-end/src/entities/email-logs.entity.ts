import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Group } from './user-details.entity';

export type EmailLogStatus = 'SUCCESS' | 'ERROR';

export enum EmailTypeEnum {
  // Signup
  VerifyOtp = 'Verify Otp',
  UserSignUpAcknowledgement = 'User sign up acknowledgement',
  intimateAdminUserSignup = 'Intimate admin user sign up',
  updatePasswordConfirmation = 'Update password confirmation',
  VerifyUser = 'Verify user',
  // User -> User Access
  UserJoined = 'User joined',
  makePrimaryAdmin = 'Make primary admin',
  newUserInvite = 'New user invite',
  inviteExistUserToCmpy = 'Invite user to company',
  UserAcceptDecline = 'User accept or decine admin request',
  AdminAcceptDecline = 'Admin accept or decline user request',
  // Compliance
  failedCompliance = 'Failed compliance',
  // Xero
  xeroSyncFailures = 'Xero sync failures daily',
  // Communication management
  communicationManagement = 'Communication management',
  // Community
  newIdeaDiscussion = 'New idea discussion',
  discussionIdeaDetail = 'Detail discussion idea',
  newResponse = 'Community - new response',
  // Notice
  notice = 'Notice',
  qbccNotice = 'QBCC notice',
  adminQbccNotice = 'Admin QBCC notice',
  adminQbccReminder = 'Admin QBCC reminder',
  // Integration
  adatreeIntegration = 'Adatree integration',
  // Subscription
  subscriptionTrialPeriod = 'Subscription trial period',
  subscriptionPlanPricing = 'Subscription plan pricing',
  // Admin access - Service
  holidayReminder = 'Holiday reminder',
  // Admin access - Resolver
  adminResetUserPassword = 'Admin reset user password',
  adminAddedUser = 'Admin added user',
  intimateAdmin = 'Intimate admin for added user',
  adminAddedBusiness = 'Admin added business',
  // Pt Admin - Resolver
  addedPortalAdmin = 'Added portal admin',
  adminMailVerify = 'Admin mail verify',
  resetAdminPassword = 'Reset admin password',
  // Support Ticket
  acknowledgeEmailToTicket = 'Acknowledge for support ticket',
  notificationEmailOnTicketSubmission = 'Notification email on support ticket submission',
  ticketReplyToUser = 'Support ticket reply to user',
}

@Entity()
export class EmailQueuerLogs {
  @PrimaryColumn({ name: 'job_id', unique: true })
  jobId: string;

  @Column({ name: 'from_email_id' })
  fromEmailId: string;

  @Column({ name: 'to_email_ids', type: 'simple-array' })
  toEmailIds: string[];

  @Column({ name: 'email_cc_ids', type: 'simple-array', nullable: true })
  emailCcIds?: string[];

  @Column({ name: 'mail_details' })
  mailDetails: string;

  @Column({ name: 'mail_type', type: 'varchar', nullable: true })
  mail_type: string;

  @Column({ name: 'status' })
  status: EmailLogStatus;

  @Column({ name: 'error_message', nullable: true })
  errorMessage: string;

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
