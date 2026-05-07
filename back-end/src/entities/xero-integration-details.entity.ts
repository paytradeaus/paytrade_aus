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

  // Task #42 — counter used by the hourly Xero scheduler to avoid demoting a
  // healthy integration to `Inactive` after a single transient failure of
  // GET /connections. Reset to 0 whenever the tenant is found.
  @Column({ type: 'integer', nullable: true, default: 0 })
  consecutive_missing_tenant_count: number;

  @Column({ type: 'uuid', nullable: true })
  project_category_id: string;

  @Column({ type: 'uuid', nullable: true })
  contract_category_id: string;

  @Column({ type: 'text', nullable: true })
  invoice_code: string;

  @Column({ type: 'text', nullable: true })
  bill_code: string;

  // Task #41 — Variable bill code per supplier.
  // When ON, outbound bill creation looks up the per-supplier (and
  // optionally per-supplier×project) override before falling back to
  // `bill_code`. Inbound webhook validation also accepts any account code
  // currently mapped on a supplier and can auto-learn from the
  // `bill_code_naming_convention` substring against the Xero CoA.
  @Column({ type: 'boolean', nullable: true, default: false })
  bill_code_is_variable: boolean;

  // Naming convention used for inbound auto-discovery — when an inbound
  // bill arrives with no PT-side mapping for the supplier, the resolver
  // scans the active Xero chart of accounts for an account whose name
  // contains this substring (case-insensitive). On a hit the matched
  // account code is persisted as the supplier default (or per-project
  // override if a project is in scope) and a warning sync log is written.
  @Column({ type: 'text', nullable: true })
  bill_code_naming_convention: string;

  // When variable mode is ON and this flag is OFF, outbound pushes for
  // suppliers without a resolved override fail up-front (no Xero call,
  // no fallback to `bill_code`) and a FAIL sync log is written.
  @Column({ type: 'boolean', nullable: true, default: true })
  bill_code_allow_fallback: boolean;

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

  // Phase 1 retention controls. `retention_recording_mode` decides whether
  // retention amounts are stored on the Xero retention line ex-GST (default,
  // legacy behaviour) or inc-GST (some BAS-Excluded → GST-on-Expenses
  // configurations want the gross figure on the line). When `inc_gst`, the
  // producer must gross up retention/liability/release lines on Inclusive
  // invoices regardless of the destination account tax type, and the
  // consumer must derive the ex-GST/GST split from the line's unitAmount
  // (unit/1.1, unit - unit/1.1) instead of trusting the per-line taxAmount.
  // `retention_tax_type` is the explicit Xero taxType to stamp on retention
  // lines (overrides the account-derived taxType when set).
  @Column({
    type: 'enum',
    enum: ['ex_gst', 'inc_gst'],
    nullable: true,
    default: 'ex_gst',
  })
  retention_recording_mode: 'ex_gst' | 'inc_gst';

  @Column({ type: 'text', nullable: true })
  retention_tax_type: string;

  // Phase 3 — Auto gross-up retention journals. When ON, the producer/
  // consumer pipelines post a 2-line POSTED Manual Journal to Xero whenever
  // a Claim is created (DR Retention Payable / CR Retention Held for the
  // GST portion of the retention) and a reversal MJ when the Retention
  // claim is created. Only meaningful when
  // `simplified_retention_accounting=false` AND
  // `retention_recording_mode='ex_gst'` — for inc_gst the gross figure is
  // already on the retention line so an MJ would double-count, and the
  // simplified 2-line shape doesn't carry a separate liability leg to
  // gross up. See `XeroManualJournalService` for the smart tax-type
  // resolution order.
  @Column({ type: 'boolean', nullable: true, default: false })
  auto_gross_up_retention_journals: boolean;

  // Phase 2: cached Xero organisation GST defaults. Refreshed on connect
  // and via daily scheduler. `xero_org_default_sales_tax` /
  // `xero_org_default_purchases_tax` are the org-level fallback tax types
  // used when a contact's per-contact override is blank.
  @Column({ type: 'varchar', length: 8, nullable: true })
  xero_org_country_code: string;

  @Column({ type: 'boolean', nullable: true })
  xero_org_is_gst_registered: boolean;

  @Column({ type: 'text', nullable: true })
  xero_org_sales_tax_basis: string;

  @Column({ type: 'text', nullable: true })
  xero_org_default_sales_tax: string;

  @Column({ type: 'text', nullable: true })
  xero_org_default_purchases_tax: string;

  @Column({ type: 'timestamp with time zone', nullable: true })
  xero_org_settings_synced_at: Date;

  @Column({ type: 'boolean', nullable: true, default: false })
  pt_to_xero_bank_auto_create: boolean;

  @Column({ type: 'boolean', nullable: true, default: false })
  xero_to_pt_bank_auto_create: boolean;

  @Column({ type: 'boolean', nullable: true, default: false })
  pt_to_xero_contact_auto_create: boolean;

  @Column({ type: 'boolean', nullable: true, default: false })
  xero_to_pt_contact_auto_create: boolean;

  @Column({ type: 'boolean', nullable: true, default: false })
  pt_to_xero_project_auto_create: boolean;

  @Column({ type: 'boolean', nullable: true, default: false })
  xero_to_pt_project_auto_create: boolean;

  @Column({ type: 'boolean', nullable: true, default: false })
  pt_to_xero_contract_auto_create: boolean;

  @Column({ type: 'boolean', nullable: true, default: false })
  xero_to_pt_contract_auto_create: boolean;

  @Column({ type: 'boolean', nullable: true, default: false })
  sync_contact_financial_to_xero: boolean;

  @Column({ type: 'boolean', nullable: true, default: false })
  sync_contact_financial_to_pt: boolean;

  @Column({ type: 'boolean', nullable: true, default: false })
  smart_contract_auto_create: boolean;

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
