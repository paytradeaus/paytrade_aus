import {
  AfterInsert,
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
import { Group } from './user-details.entity';
import { CompanyDetails } from './company-details.entity';
import { ProjectDetails } from './project-details.entity';
import { ContractDetails } from './contract-details.entity';
import { BankAccounts } from './banking.entity';
import { FileAttachments } from './file-attachments.entity';
import {
  NoticeStatus,
  NoticeTypes,
} from 'src/libs/@paytrade-types/paytrade-types';
import { NoticeTemplates } from './notices-templates.entity';
import { NoticeMail } from './notice-mail.enitity';
import { ClientSuppliersDetails } from './client-suppliers-details.entity';
import { PaymentDetails } from './payment-details.entity';
import { AuditReport } from './audit-report.entity';

@Entity()
export class NoticeDetails {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'bigint', unique: true })
  @Generated('increment')
  notice_id: number;

  @Column({ type: 'int' })
  company_id: number;

  @Column({ type: 'int', nullable: true })
  project_id: number;

  @Column({ type: 'int', nullable: true })
  contract_id: number;

  @Column({ type: 'int', nullable: true })
  client_supplier_id: number;

  @Column({ type: 'bigint', nullable: true })
  bank_account_id: number;

  @Column({ type: 'int', nullable: true })
  notice_template_id: number;

  @Column({ type: 'bigint', nullable: true })
  payment_claim_id: number;

  @Column({ type: 'bigint', nullable: true })
  payment_id: number;

  @Column({ type: 'bigint', nullable: true })
  audit_id: number;

  @Column({ type: 'text', nullable: true })
  supporting_file_attachment_id: string;

  @Column({
    type: 'timestamp with time zone',
    nullable: true,
    default: () => "timezone('utc', now())",
  })
  notice_date: Date;

  @Column({
    type: 'enum',
    enum: [
      'QBCC TA1 Project Trust Account Notice',
      'Client S18B Project Trust Account Notice',
      'Supplier S23 Project Trust Account Notice',
      'QBCC TA3 Notice Of Related Entities',
      'Supplier S18C Project Trust Account Notice',
      'Client Payment Claim Notice',
      'Supplier Payment Schedule Notice',
      'Supplier Payment Remittance Advice Notice',
      'QBCC TA4 Part Payment Notice',
      'QBCC TA2 Account Closing Notice',
      'QBCC TA5 Nil Return Notice',
      'Supplier Retention Payment Remittance Notice',
      'Supplier Retention Payment Schedule Notice',
      'Supplier Payment with Retention Withheld Notice',
      'Supplier Payment with Retention Schedule Notice',
      'Supplier S23 Retention Trust Account Notice',
      'Supplier S18C Retention Trust Account Notice',
      'QBCC TA1 Retention Trust Account Notice',
      'Contracting Party Account Closing Notice',
      'QBCC TA2 Retention Account Closing Notice',
    ],

    nullable: true,
  })
  notice_type: NoticeTypes;

  @Column({
    type: 'enum',
    enum: [
      'Draft',
      'Not Sent',
      'Sent',
      'Sending',
      'Delete-Unsent',
      'Delete-Sent',
      'Sent - Onboarded',

      'Received',
      'Delete-Received',
    ],
    default: 'Not Sent',
  })
  status: NoticeStatus;

  @Column({ type: 'text', nullable: true })
  memo: string;

  @Column({ type: 'text', nullable: true })
  notice_source: string;

  @Column({ name: 'delegated_qbcc', type: 'boolean', default: false })
  delegated_qbcc: boolean;

  @Column({ type: 'boolean', default: false })
  has_import_button: boolean;

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
    default: 'USER',
    nullable: true,
  })
  created_group: Group;

  @Column({
    type: 'enum',
    enum: ['SYSTEM', 'USER', 'ADMIN'],
    default: 'USER',
    nullable: true,
  })
  updated_group: Group;

  @Column({ type: 'simple-array', nullable: true })
  supporting_file_attachment_ids?: string[];

  @ManyToOne(() => CompanyDetails, (company) => company.noticeDetails)
  @JoinColumn({ name: 'company_id', referencedColumnName: 'company_id' })
  companyDetails?: CompanyDetails;

  @ManyToOne(() => ProjectDetails, (project) => project.noticeDetails)
  @JoinColumn({ name: 'project_id', referencedColumnName: 'project_id' })
  projectDetails?: ProjectDetails;

  @ManyToOne(() => ContractDetails, (contract) => contract.noticeDetails)
  @JoinColumn({ name: 'contract_id', referencedColumnName: 'contract_id' })
  contractDetails?: ContractDetails;

  @ManyToOne(() => PaymentDetails, (payment) => payment.noticeDetails)
  @JoinColumn({ name: 'payment_id', referencedColumnName: 'payment_id' })
  paymentDetails?: PaymentDetails;

  @ManyToOne(() => AuditReport, (audit) => audit.noticeDetails)
  @JoinColumn({ name: 'audit_id', referencedColumnName: 'audit_id' })
  auditDetails?: AuditReport;

  @ManyToOne(() => ClientSuppliersDetails, (client) => client.noticeDetails)
  @JoinColumn({
    name: 'client_supplier_id',
    referencedColumnName: 'client_supplier_id',
  })
  clientSupplierDetails?: ClientSuppliersDetails;

  @ManyToOne(() => NoticeTemplates, (template) => template.noticeDetails)
  @JoinColumn({
    name: 'notice_template_id',
    referencedColumnName: 'notice_template_id',
  })
  templateDetails?: NoticeTemplates;

  @OneToOne(() => FileAttachments, (notice) => notice.uploadedNotice, {
    nullable: true,
  })
  @JoinColumn({ name: 'uploadedNotice' })
  uploaded_notice?: FileAttachments;

  @OneToOne(() => FileAttachments, (notice) => notice.qbccUploadedNotice, {
    nullable: true,
  })
  @JoinColumn({ name: 'qbccUploadedNotice' })
  qbcc_uploaded_notice?: FileAttachments;

  @ManyToOne(() => BankAccounts, (bankAccount) => bankAccount.noticeDetails, {
    nullable: true,
  })
  @JoinColumn({
    name: 'bank_account_id',
    referencedColumnName: 'bank_account_id',
  })
  accountDetails?: BankAccounts;

  // @ManyToOne(() => FileAttachments, (notice) => notice.supportingNoticeFiles, {
  //   nullable: true,
  // })
  // @JoinColumn({ name: 'supporting_file_attachment_id' })
  // supportingFileAttachment: FileAttachments;

  @OneToMany(() => NoticeMail, (noticeMail) => noticeMail.noticeDetails)
  noticeMail: NoticeMail[];

  @AfterInsert()
  updateNoticeId() {
    console.log(this.notice_id);
  }
}
