import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Generated,
  CreateDateColumn,
  UpdateDateColumn,
  AfterInsert,
  Timestamp,
  OneToOne,
  JoinColumn,
  ManyToOne,
  OneToMany,
  ManyToMany,
} from 'typeorm';
import { CISRate } from './cis-rate.entity';
import { AccountingSystem } from './accounting-system.entity';
import { FileAttachments } from '../entities/file-attachments.entity';
import { CompanyUserRoles } from './company-user-roles.entity';
import { Invitations } from './invitations.entity';
import { ProjectDetails } from './project-details.entity';
import { ContractDetails } from './contract-details.entity';
import { ClientSuppliersDetails } from './client-suppliers-details.entity';
import { VariationDetails } from './variation-details.entity';
import { Group } from './user-details.entity';
import { PaymentClaims } from './banking.entity';
import { PaymentDetails } from './payment-details.entity';
import { NoticeDetails } from './notices-details.entity';
import { JournalEntries } from './journal-entries.entity';
import { ReconciliationReport } from './reconciliation-report.entity';
import { AuditReport } from './audit-report.entity';
import { SubscriptionDetails } from './subscription-details.entity';
import { SubscriptionTransaction } from './subscription-transactions.entity';
import { ActivityLogNew } from './activity-log-new.entity';
import { XeroIntegrationDetails } from './xero-integration-details.entity';
import { IntegrationDetails } from './integration-details.entity';
import { CompanyCouponDetails } from './company-coupon-details.entity';
export type EntityType = 'Business' | 'Sole Trader' | 'Personal';

export const CompanyEmailPreferences = ['compliance', 'notices'];

@Entity()
export class CompanyDetails {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'integer', unique: true })
  @Generated('increment')
  company_id: number;

  @Column({ type: 'varchar', length: 10, nullable: true })
  company_number: string; // input field in ppt slide 28

  @Column({ type: 'varchar', length: 150 })
  company_name: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  legal_company_name: string;

  @Column({ type: 'varchar', length: 100 })
  company_email_id: string;

  @Column({ type: 'varchar', length: 20 })
  company_phone_no: string;

  @Column({
    type: 'enum',
    enum: ['Business', 'Sole Trader', 'Personal'],
  })
  entity_type: EntityType;

  @Column({ type: 'text' })
  place_id: string;

  @Column({ type: 'varchar', length: 200 })
  company_address: string;

  @Column({ type: 'varchar', length: 50 })
  country: string;

  @Column({ type: 'varchar', length: 50 })
  region: string;

  @Column({ type: 'varchar', length: 50 })
  latitude: string;

  @Column({ type: 'varchar', length: 50 })
  longitude: string;

  @Column({ type: 'varchar', length: 8, nullable: true })
  qbcc_number: string;

  @Column({ type: 'varchar', length: 9, nullable: true })
  acn_number: string;

  @Column({ type: 'varchar', length: 11, nullable: true })
  abn_number: string;

  @Column({ type: 'varchar', length: 9, nullable: true })
  tfn_number: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  vat_number: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  utr_number: string;

  @Column({ type: 'int', nullable: true })
  cis_rate: number; //Pay Trade to provide list

  @ManyToOne((type) => CISRate)
  @JoinColumn([{ name: 'cis_rate', referencedColumnName: 'id' }])
  cisRate: CISRate;

  @Column({ type: 'int', nullable: true })
  accounting_system: number;

  @ManyToOne((type) => AccountingSystem)
  @JoinColumn([{ name: 'accounting_system', referencedColumnName: 'id' }])
  accountingSystem: AccountingSystem;

  @Column({ default: false, nullable: true })
  is_verified: Boolean;

  @Column({ default: false })
  is_admin_blocked: Boolean;

  @Column({ default: false })
  is_system_added: Boolean;

  @Column({ default: false })
  is_demo: boolean;

  // Phase 2: business-level GST registration flag. NULL = unknown (legacy
  // rows). True = the business is registered for GST. Surfaces in the
  // Business Profile and feeds `resolveContactGstStatus()` as the final
  // fallback before "unknown".
  @Column({ type: 'boolean', nullable: true, default: null })
  is_gst_registered: boolean;

  @Column({ nullable: true })
  logo_id: string;

  @ManyToOne((type) => FileAttachments)
  @JoinColumn([{ name: 'logo_id', referencedColumnName: 'id' }])
  fileAttachments: FileAttachments;

  @Column({ type: 'simple-array', nullable: true })
  training_records_ids: string[];

  @ManyToMany((type) => FileAttachments)
  @JoinColumn([{ name: 'training_records_ids', referencedColumnName: 'id' }])
  fileAttachment: FileAttachments[];

  @Column({
    type: 'json',
    nullable: true, // need to remove null in production
    default: {
      compliance: true,
      notices: false,
    },
  })
  email_preferences: Record<string, any>;

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

  @OneToMany(() => CompanyUserRoles, (company) => company.companyDetails)
  userRoles: CompanyUserRoles[];

  @OneToMany(() => Invitations, (company) => company.companyDetails)
  invitations: Invitations[];

  @OneToMany(() => ActivityLogNew, (company) => company.companyDetails)
  activityLogNew: ActivityLogNew[];

  @OneToMany(() => ProjectDetails, (company) => company.companyDetails)
  projectDetails: ProjectDetails[];

  @OneToMany(() => ClientSuppliersDetails, (company) => company.companyDetails)
  clientSuppliersDetails: ClientSuppliersDetails[];

  @OneToMany(() => ContractDetails, (company) => company.companyDetails)
  contractDetails: ContractDetails[];

  @OneToMany(() => VariationDetails, (company) => company.companyDetails)
  variationDetails: VariationDetails[];

  @OneToMany(() => PaymentClaims, (company) => company.companyDetails)
  paymentClaims: PaymentClaims[];

  @OneToMany(() => PaymentDetails, (company) => company.companyDetails)
  paymentDetails: PaymentDetails[];

  @OneToMany(() => NoticeDetails, (company) => company.companyDetails)
  noticeDetails: NoticeDetails[];

  @OneToMany(() => JournalEntries, (company) => company.companyDetails)
  journalEntries: JournalEntries[];

  @OneToMany(() => ReconciliationReport, (company) => company.companyDetails)
  reportDetails: ReconciliationReport[];

  @OneToMany(() => AuditReport, (company) => company.companyDetails)
  auditDetails: AuditReport[];

  @OneToOne(() => SubscriptionDetails, (company) => company.companyDetails)
  subscriptionDetails: SubscriptionDetails;

  @OneToOne(() => SubscriptionTransaction, (company) => company.companyDetails)
  subscriptionTransactions: SubscriptionTransaction;

  @OneToMany(() => IntegrationDetails, (company) => company.companyDetails)
  integrationDetails: IntegrationDetails;

  @OneToMany(() => XeroIntegrationDetails, (company) => company.companyDetails)
  xeroIntegration: XeroIntegrationDetails;

  @OneToMany(() => CompanyCouponDetails, (company) => company.companyDetails)
  companyCouponDetails: CompanyCouponDetails[];

  @AfterInsert()
  updateCompanyId() {
    console.log(this.company_id);
  }
}
