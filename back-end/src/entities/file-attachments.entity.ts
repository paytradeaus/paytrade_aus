import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  OneToMany,
  ManyToMany,
  ManyToOne,
} from 'typeorm';
import { Group, UserDetails } from './user-details.entity';
import { CompanyDetails } from './company-details.entity';
import { CommunicationEmails } from './communication-emails.entity';
import { BlogResource } from './admin-blogs-resources.entity';
import { ContractDetails } from './contract-details.entity';
import { VariationDetails } from './variation-details.entity';
import { PaymentDetails } from './payment-details.entity';
import { NoticeTemplates } from './notices-templates.entity';
import { NoticeDetails } from './notices-details.entity';
import { AuditReport } from './audit-report.entity';
import { AdminDetails } from './admin-details.entity';
import { CmtyDiscussionsIdeas } from './cmty-discussion-idea.entity';
import { CmtyAnswersComments } from './cmty-answers-comments.entity';
import { GenerateABAFileHistory } from './generate-aba-history.entity';

@Entity()
export class FileAttachments {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  file_name: string;

  @Column({ type: 'text', nullable: true })
  custom_file_name: string;

  @Column({ type: 'varchar', length: 100 })
  file_type: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  file_path: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  attachment_type: string;

  @Column({ type: 'varchar', length: 100, default: 'SYSTEM' })
  uploaded_by: string;

  @Column({
    type: 'timestamp with time zone',
    default: () => "timezone('utc', now())",
  })
  uploaded_on: Date;

  @Column({
    type: 'enum',
    enum: ['SYSTEM', 'USER', 'ADMIN'],
    default: 'SYSTEM',
    nullable: true,
  })
  uploaded_group: Group;

  @OneToOne(() => BlogResource, (blogResource) => blogResource.banner, {
    nullable: true,
  })
  blogBanner: BlogResource;

  @OneToOne(() => NoticeTemplates, (notice) => notice.notice_template, {
    nullable: true,
  })
  noticeTemplate: NoticeTemplates;

  @OneToOne(() => NoticeDetails, (notice) => notice.uploaded_notice, {
    nullable: true,
  })
  uploadedNotice: NoticeDetails;

  @OneToOne(() => NoticeDetails, (notice) => notice.qbcc_uploaded_notice, {
    nullable: true,
  })
  qbccUploadedNotice: NoticeDetails;

  @OneToOne(() => BlogResource, (blogResource) => blogResource.attachment, {
    nullable: true,
  })
  resources: BlogResource;

  // @OneToMany(() => NoticeDetails, (notice) => notice.supportingFileAttachment, {
  //   nullable: true,
  // })
  // supportingNoticeFiles: NoticeDetails[];

  @OneToMany(() => UserDetails, (user) => user.fileAttachments)
  userDetails: UserDetails[];

  @OneToMany(() => AdminDetails, (user) => user.fileAttachments)
  adminDetails: AdminDetails[];

  @OneToMany(() => CompanyDetails, (company) => company.fileAttachments)
  companyDetails: CompanyDetails[];

  @ManyToMany(() => CompanyDetails, (company) => company.fileAttachment)
  companyDetail: CompanyDetails[];

  @OneToMany(
    () => PaymentDetails,
    (company) => company.compulsoryFileAttachments,
  )
  compulsoryPaymentDetails: PaymentDetails[];

  @ManyToMany(
    () => PaymentDetails,
    (company) => company.optionalFileAttachments,
  )
  optionalPaymentDetails: PaymentDetails[];

  @ManyToMany(() => CommunicationEmails, (email) => email.fileAttachments, {
    nullable: true,
  })
  communicationEmails?: CommunicationEmails[];

  @OneToOne(() => ContractDetails, (contract) => contract.fileAttachments)
  contractDetails: ContractDetails;

  @OneToOne(() => VariationDetails, (variation) => variation.fileAttachments)
  variationDetails: VariationDetails;

  // @OneToOne(() => AuditReport, (audit) => audit.fileAttachments)
  // auditDetails: AuditReport;

  // @ManyToOne(() => AuditReport, (audit) => audit.fileAttachments)
  // @JoinColumn({ name: 'audit_id' }) // this creates the foreign key in file_attachments table
  // auditDetails: AuditReport;

  @ManyToMany(
    () => CmtyDiscussionsIdeas,
    (discIdea) => discIdea.fileAttachments,
  )
  discIdeaDetails: CmtyDiscussionsIdeas[];

  @ManyToMany(() => CmtyAnswersComments, (discIdea) => discIdea.fileAttachments)
  ansCommentDetails: CmtyAnswersComments[];

  @OneToOne(
    () => GenerateABAFileHistory,
    (abaFileHistory) => abaFileHistory.fileAttachments,
  )
  abaFileHistory: GenerateABAFileHistory;
}
