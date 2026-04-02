import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  ManyToOne,
  OneToMany,
  ManyToMany,
  OneToOne,
} from 'typeorm';
import { Group } from './user-details.entity';
import { CompanyDetails } from './company-details.entity';
import { XeroProjectDetails } from './xero-project-details.entity';
import { XeroContactDetails } from './xero-contact-details.entity';
import { XeroBankAccountDetails } from './xero-bank-account-details.entity';
import { XeroContractDetails } from './xero-contract-details.entity';
import { IntegrationDetails } from './integration-details.entity';
import { XeroSyncLogs } from './xero-sync-logs.entity';
import { XeroInvoicesBills } from './xero-invoices-bills.entity';
import { SyncAsDraftStatus } from 'src/libs/@paytrade-types/paytrade-types';
import { XeroPayments } from './xero-payments.entity';
interface ActionButtons {
  import_bank: boolean;
  import_contact: boolean;
  import_project: boolean;
}

@Entity()
export class XeroIntegrationDetails {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'integer', unique: true, nullable: true }) //remove null
  integration_id: number;

  @Column({ type: 'integer' })
  company_id: number;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'text', nullable: true })
  tenant_name: string;

  @Column({ type: 'varchar', length: 100 })
  tenant_type: string;

  @Column({ type: 'varchar', length: 50 })
  status: string;

  @Column({ type: 'varchar', length: 50 })
  subscription_status: string;

  @Column({ type: 'text', nullable: true })
  id_token: string;

  @Column({ type: 'text', nullable: true })
  access_token: string;

  @Column({ type: 'text', nullable: true })
  refresh_token: string;

  @Column({ nullable: true })
  expires_at: number;

  @Column({ type: 'uuid', nullable: true })
  project_category_id: string;

  @Column({ type: 'uuid', nullable: true })
  contract_category_id: string;

  @Column({ type: 'text', nullable: true })
  invoice_code: string;

  @Column({ type: 'text', nullable: true })
  bill_code: string;

  @Column({ type: 'text', nullable: true })
  retention_payable_retained_code: string;

  @Column({ type: 'text', nullable: true })
  retention_payable_release_code: string;

  @Column({ type: 'text', nullable: true })
  retention_receivable_retained_code: string;

  @Column({ type: 'text', nullable: true })
  retention_receivable_release_code: string;

  @Column({ type: 'text', nullable: true })
  liability_payable_code: string;

  @Column({ type: 'text', nullable: true })
  liability_receivable_code: string;

  // liability account codes are optional and retention sync uses 2-line pattern instead of 3-line.
  @Column({ type: 'boolean', nullable: true, default: false })
  simplified_retention_accounting: boolean;

  @Column({ type: 'text', nullable: true })
  invoice_tax_code: string;

  @Column({ type: 'text', nullable: true })
  bill_tax_code: string;

  @Column({
    type: 'enum',
    enum: ['Yes', 'No'],
    default: 'No',
  })
  pt_to_xero_invoice_as_draft: SyncAsDraftStatus;

  @Column({
    type: 'enum',
    enum: ['Yes', 'No'],
    default: 'No',
  })
  pt_to_xero_bill_as_draft: SyncAsDraftStatus;

  @Column({
    type: 'enum',
    enum: ['Yes', 'No'],
    default: 'No',
  })
  pt_to_xero_payment_as_draft: SyncAsDraftStatus;

  @Column({
    type: 'enum',
    enum: ['Yes', 'No'],
    default: 'No',
  })
  xero_to_pt_invoice_as_draft: SyncAsDraftStatus;

  @Column({
    type: 'enum',
    enum: ['Yes', 'No'],
    default: 'No',
  })
  xero_to_pt_bill_as_draft: SyncAsDraftStatus;

  @Column({
    type: 'enum',
    enum: ['Yes', 'No'],
    default: 'No',
  })
  xero_to_pt_payment_as_draft: SyncAsDraftStatus;

  @Column({
    type: 'jsonb',
    default: {
      import_bank: false,
      import_contact: false,
      import_project: false,
    },
  })
  action_buttons: ActionButtons;

  @Column({ type: 'text', nullable: true })
  reference_format: string;

  @Column({ default: 30 })
  wait_time: number;

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

  @ManyToOne(() => CompanyDetails, (integration) => integration.xeroIntegration)
  @JoinColumn({ name: 'company_id', referencedColumnName: 'company_id' })
  companyDetails: CompanyDetails;

  @OneToOne(
    () => IntegrationDetails,
    (integration) => integration.xeroIntegration,
  )
  @JoinColumn({
    name: 'integration_id',
    referencedColumnName: 'integration_id',
  })
  integrationDetails: IntegrationDetails;

  @OneToMany(
    () => XeroProjectDetails,
    (tenant) => tenant.xeroIntegrationDetails,
  )
  xeroProjectDetails: XeroProjectDetails[];

  @OneToMany(
    () => XeroContactDetails,
    (tenant) => tenant.xeroIntegrationDetails,
  )
  xeroContactDetails: XeroContactDetails[];

  @OneToMany(
    () => XeroBankAccountDetails,
    (tenant) => tenant.xeroIntegrationDetails,
  )
  xeroBankAccountDetails: XeroBankAccountDetails[];

  @OneToMany(
    () => XeroContractDetails,
    (tenant) => tenant.xeroIntegrationDetails,
  )
  xeroContractDetails: XeroContractDetails[];

  @OneToMany(() => XeroInvoicesBills, (tenant) => tenant.xeroIntegrationDetails)
  xeroInvoicesBills: XeroInvoicesBills[];

  @OneToMany(() => XeroPayments, (tenant) => tenant.xeroIntegrationDetails)
  xeroPayments: XeroPayments[];

  @OneToMany(() => XeroSyncLogs, (tenant) => tenant.xeroIntegrationDetails)
  xeroSyncLogs: XeroSyncLogs[];
}
