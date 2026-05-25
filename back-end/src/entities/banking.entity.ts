import {
  BankAccountType,
  BankAccountStatus,
  LastUpdateType,
  TransactionStatus,
  BankStatementStatus,
  DelegatePowers,
  PaymentClaimTypes,
  CashRetentionType,
  ClosingMode,
} from 'src/libs/@paytrade-types/paytrade-types';
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
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CompanyDetails } from './company-details.entity';
import { FileAttachments } from './file-attachments.entity';
import { Group } from './user-details.entity';
import { ProjectDetails } from './project-details.entity';
import { ClientSuppliersDetails } from './client-suppliers-details.entity';
import { ContractDetails } from './contract-details.entity';
import { PaymentDetails } from './payment-details.entity';
import { NoticeDetails } from './notices-details.entity';
import { JournalEntries } from './journal-entries.entity';
import { ReconciliationReport } from './reconciliation-report.entity';
import { AuditReport } from './audit-report.entity';
import { XeroBankAccountDetails } from './xero-bank-account-details.entity';
import { XeroInvoicesBills } from './xero-invoices-bills.entity';

@Entity()
export class BankAccounts {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'bigint', unique: true })
  @Generated('increment')
  bank_account_id: number;

  @Column({ type: 'varchar', length: 150 })
  account_name: string;

  @Column({
    type: 'enum',
    enum: ['Cash Account', 'Project Trust Account', 'Retention Trust Account'],
    nullable: true,
  })
  account_type: BankAccountType;

  @Column({ type: 'varchar', length: 100, nullable: true })
  account_number: string;

  @Column({ type: 'int', nullable: true })
  bsb_number: number;

  // Stored as `varchar(6)` so that user-entered leading zeros are
  // preserved (e.g. "000000" is a valid APCA placeholder used by many
  // banks). The column was originally `int` but that silently dropped
  // leading zeros, which made the field appear empty after save. The
  // schema is migrated at bootstrap by
  // `ApcaNumberStringSchemaSeederService`.
  @Column({ type: 'varchar', length: 6, nullable: true })
  apca_number: string;

  @Column({ type: 'int' })
  company_id: number;

  @ManyToOne((type) => CompanyDetails)
  @JoinColumn([{ name: 'company_id', referencedColumnName: 'company_id' }])
  companyId: CompanyDetails;

  @Column({ type: 'simple-array', nullable: true })
  project_ids: number[];

  //sample for array - dont remove
  // @Column({ type: 'int', array: true, nullable: true })
  // temp_project_ids: number[];

  @Column({ type: 'int', nullable: true })
  trustee_id: number;

  @Column({ type: 'int', nullable: true })
  client_supplier_id?: number;

  @Column({ type: 'date', nullable: true })
  contract_date: Date;

  @Column({ type: 'date', nullable: true })
  opening_date: Date;

  @Column({ type: 'date', nullable: true })
  contract_practical_completion_date: Date;

  @Column({ type: 'date', nullable: true })
  first_sub_contract_date: Date;

  @Column({ type: 'decimal', precision: 13, scale: 2, nullable: true })
  contract_value: number;

  @Column({
    type: 'simple-array',
    nullable: true,
  })
  retention_trust_certificate_attachment_ids?: string[];

  @ManyToMany((type) => FileAttachments)
  @JoinColumn([
    {
      name: 'retention_trust_certificate_attachment_id',
      referencedColumnName: 'id',
    },
  ])
  retentionTrustCertificateAttachmentId: FileAttachments[];

  @Column({
    type: 'enum',
    enum: [
      'Draft',
      'Open',
      'Closed',
      'Active',
      'Deleted',
      'Archived',
      'Transferred',
    ],
    default: 'Draft',
  })
  status: BankAccountStatus;

  @Column({
    type: 'enum',
    enum: [
      'Draft',
      'Open',
      'Closed',
      'Active',
      'Deleted',
      'Archived',
      'Transferred',
    ],
    nullable: true,
  })
  previous_status: BankAccountStatus;

  @Column({ type: 'text', nullable: true })
  financial_institution: string;

  @Column({ type: 'enum', enum: ['Yes', 'No'], nullable: true })
  delegate_powers: DelegatePowers;

  @Column({ type: 'decimal', precision: 13, scale: 2, nullable: true })
  current_balance?: number;

  @Column({ type: 'decimal', precision: 13, scale: 2, nullable: true })
  interest_charges?: number;

  @Column({ default: false })
  added_by_client_supplier: Boolean;

  @Column({ type: 'boolean', default: false })
  skip_xero_auto_create: boolean;

  @Column({ type: 'bigint', nullable: true })
  associated_cash_account_id: number;

  // Task #238 — TA2 account-closing context. Set when the user invokes
  // "Close or change account" or when an account rename auto-fires a
  // name-changed TA2. Cleared (left set, but ignored) once the relevant
  // closing notices have been generated; downstream generators key off
  // these fields for the before/after / scenario flags on Form TA2.
  @Column({
    type: 'enum',
    enum: ['Closed', 'Transferred', 'Renamed'],
    nullable: true,
  })
  closing_mode?: ClosingMode;

  @Column({ type: 'date', nullable: true })
  closing_effective_date?: Date;

  @Column({ type: 'text', nullable: true })
  closing_previous_account_name?: string;

  @Column({ type: 'text', nullable: true })
  closing_target_account_name?: string;

  @Column({ type: 'text', nullable: true })
  closing_target_financial_institution?: string;

  @Column({ type: 'int', nullable: true })
  closing_target_bsb?: number;

  @Column({ type: 'text', nullable: true })
  closing_target_account_number?: string;

  @Column({ type: 'date', nullable: true })
  closing_target_opening_date?: Date;

  @Column({ type: 'int', default: 0, nullable: true })
  last_journal_id: number;

  @Column({ type: 'int', default: 0, nullable: true })
  last_activity_id: number;

  @ManyToOne((type) => BankAccounts)
  @JoinColumn([
    {
      name: 'associated_cash_account_id',
      referencedColumnName: 'bank_account_id',
    },
  ])
  associatedCashAccount: BankAccounts;

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

  @CreateDateColumn({
    type: 'timestamp with time zone',
    default: () => "timezone('utc', now())",
  })
  created_on: Date;

  @Column({ type: 'integer', nullable: true })
  created_by: number;

  @UpdateDateColumn({
    type: 'timestamp with time zone',
    default: () => "timezone('utc', now())",
  })
  updated_on: Date;

  @Column({ type: 'integer', nullable: true })
  updated_by: number;

  @Column({
    type: 'enum',
    enum: ['Manual', 'Open Banking'],
    nullable: true,
    default: 'Manual',
  })
  last_updated_type?: LastUpdateType;

  @ManyToOne(() => ClientSuppliersDetails, (account) => account.accountDetails)
  @JoinColumn({
    name: 'client_supplier_id',
    referencedColumnName: 'client_supplier_id',
  })
  clientSuppliersDetails: ClientSuppliersDetails;

  @OneToMany(() => PaymentDetails, (company) => company.paymentFromAccount)
  paymentFrom: PaymentDetails[];

  @OneToMany(() => PaymentDetails, (payment) => payment.paymentToAccount)
  paymentTo: PaymentDetails[];

  @OneToMany(() => PaymentDetails, (payment) => payment.retentionAccount)
  retentionAccount: PaymentDetails[];

  @OneToMany(
    () => ContractDetails,
    (company) => company.contractPaymentFromAccount,
  )
  contractPaymentFrom: ContractDetails[];

  @OneToMany(
    () => ContractDetails,
    (payment) => payment.contractPaymentToAccount,
  )
  contractPaymentTo: ContractDetails[];

  @OneToMany(
    () => ContractDetails,
    (payment) => payment.contractRetentionFromAccount,
  )
  contractRetentionAccount: ContractDetails[];

  @OneToMany(() => NoticeDetails, (notices) => notices.accountDetails)
  noticeDetails: NoticeDetails[];

  @OneToMany(() => JournalEntries, (company) => company.accountDetails)
  journalEntries: JournalEntries[];

  @OneToMany(() => JournalEntries, (company) => company.txnAccountDetails)
  txnJournalEntries: JournalEntries[];

  @OneToMany(() => ReconciliationReport, (account) => account.bankAccounts)
  reportDetails: ReconciliationReport[];

  @OneToMany(() => AuditReport, (account) => account.bankAccounts)
  auditDetails: AuditReport[];

  @OneToMany(() => XeroBankAccountDetails, (account) => account.bankAccounts)
  xeroBankAccountDetails: XeroBankAccountDetails[];

  @AfterInsert()
  updateBankAccountId() {
    console.log(this.bank_account_id);
  }
}

@Entity()
export class PaymentClaims {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'bigint', unique: true })
  @Generated('increment')
  payment_claim_id: number;

  @Column({ type: 'int' })
  company_id: number;

  @Column({
    type: 'enum',
    enum: ['Billable', 'Receivable'],
    default: 'Billable',
  })
  claim_type: PaymentClaimTypes;

  // claim type
  @Column({ type: 'enum', enum: ['Claim', 'Retention claim'], nullable: true })
  cash_retention_type: CashRetentionType;

  @Column({ type: 'text', default: 'Draft' })
  status: string;

  @Column({ type: 'text', nullable: true })
  previous_status: string;

  @Column({ type: 'text', default: 'Draft' })
  list_status: string;

  @Column({ type: 'int', nullable: true })
  project_id: number;

  @Column({ type: 'int', nullable: true })
  contract_id: number;

  @Column({ type: 'int', nullable: true })
  client_supplier_id: number;

  @Column({ type: 'date', nullable: true })
  due_date: Date;

  @Column({ type: 'date', nullable: true })
  sent_date: Date;

  @Column({ type: 'date', nullable: true })
  received_date: Date;

  @Column({ type: 'text', nullable: true })
  claim_reference: string;

  @Column({ type: 'decimal', precision: 55, scale: 2, nullable: true })
  claim_amount: number;

  @Column({ default: false })
  cash_retention: Boolean;

  @Column({ default: false })
  all_subcontracts_paid: Boolean;

  @Column({ default: false })
  s75_applicable: Boolean;

  @Column({ type: 'decimal', precision: 55, scale: 2, nullable: true })
  retention_amount: number;

  @Column({ type: 'decimal', precision: 55, scale: 2, nullable: true })
  retention_amount_with_gst: number;

  @Column({ type: 'decimal', precision: 55, scale: 2, nullable: true })
  retention_percentage: number;

  @Column({ type: 'text', nullable: true })
  memo: string;

  @Column({ type: 'simple-array', nullable: true })
  compulsory_attachment_ids: string[];

  @Column({ type: 'simple-array', nullable: true })
  optional_attachment_ids?: string[];

  @Column({ type: 'simple-array', nullable: true })
  optional_supporting_statement_attachment_ids?: string[];

  @Column({ type: 'bigint', nullable: true })
  associated_retention_sub_payment_id: number;

  @Column({ type: 'bigint', nullable: true })
  retention_id: number;

  @Column({ nullable: true })
  is_gst_optional: boolean;

  @Column({ type: 'simple-array', nullable: true })
  notice_ids: string[];

  @Column({ type: 'json', nullable: true, default: '{}' })
  claim_list_buttons: JSON;

  @Column({ type: 'json', nullable: true, default: '{}' })
  claim_overview_buttons: JSON;

  @Column({ type: 'json', nullable: true, default: '[]' })
  pending_claims_with_reason: { payment_claim_id: number; reason?: string }[];

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

  @ManyToOne(() => CompanyDetails, (company) => company.paymentClaims)
  @JoinColumn({ name: 'company_id', referencedColumnName: 'company_id' })
  companyDetails?: CompanyDetails;

  @ManyToOne(() => ProjectDetails, (project) => project.paymentClaims)
  @JoinColumn({ name: 'project_id', referencedColumnName: 'project_id' })
  projectDetails?: ProjectDetails;

  @ManyToOne(() => ContractDetails, (contract) => contract.paymentClaims)
  @JoinColumn({ name: 'contract_id', referencedColumnName: 'contract_id' })
  contractDetails?: ContractDetails;

  @ManyToOne(
    () => ClientSuppliersDetails,
    (clientAndSupplier) => clientAndSupplier.paymentClaims,
  )
  @JoinColumn({
    name: 'client_supplier_id',
    referencedColumnName: 'client_supplier_id',
  })
  clientSupplierDetails?: ClientSuppliersDetails;

  @OneToMany(() => PaymentDetails, (company) => company.companyDetails)
  paymentDetails: PaymentDetails[];

  @OneToMany(() => XeroInvoicesBills, (claim) => claim.paymentClaims)
  xeroInvoicesBills: XeroInvoicesBills[];

  @OneToMany(() => PaymentClaimInvoices, (claim) => claim.paymentClaims)
  paymentClaimInvoices: PaymentClaimInvoices[];
}

@Entity()
export class PaymentClaimInvoices {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int', nullable: true })
  payment_claim_id: number;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'decimal', precision: 13 })
  quantity: number;

  @Column({ type: 'decimal', precision: 13, scale: 2 })
  unit_price: number;

  //Auto-calculated at 10% of total amount (quantity * unit price )
  @Column({ type: 'decimal', precision: 25, scale: 2 })
  gst: number;

  //Auto-calculated inclusive of GST.
  @Column({ type: 'decimal', precision: 55, scale: 2 })
  total_amount_including_gst: number;

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

  @CreateDateColumn({
    type: 'timestamp with time zone',
    default: () => "timezone('utc', now())",
  })
  created_on: Date;

  @Column({ type: 'integer', nullable: true })
  created_by: number;

  @UpdateDateColumn({
    type: 'timestamp with time zone',
    default: () => "timezone('utc', now())",
  })
  updated_on: Date;

  @Column({ type: 'integer', nullable: true })
  updated_by: number;

  @ManyToOne(() => PaymentClaims, (claim) => claim.paymentClaimInvoices)
  @JoinColumn({
    name: 'payment_claim_id',
    referencedColumnName: 'payment_claim_id',
  })
  paymentClaims?: PaymentClaims;
}

@Entity()
export class Transactions {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'bigint' })
  bank_account_id: number;

  @Column({ type: 'int' })
  company_id: number;

  @ManyToOne((type) => CompanyDetails)
  @JoinColumn([{ name: 'company_id', referencedColumnName: 'company_id' }])
  companyId: CompanyDetails;

  @Column({ type: 'text', nullable: true })
  transaction_csv_file_attachment_id?: string;

  @Column({
    type: 'timestamp with time zone',
    default: () => "timezone('utc', now())",
  })
  transaction_date: Date;

  @Column({
    type: 'enum',
    enum: ['To Review', 'Unmatched', 'Matched', 'Excluded'],
    default: 'Unmatched',
  })
  status: TransactionStatus;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'text' })
  spent_amount: string;

  @Column({ type: 'text' })
  received_amount: string;

  @Column({ type: 'int', nullable: true })
  payment_claim_id?: number;

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

  @CreateDateColumn({
    type: 'timestamp with time zone',
    default: () => "timezone('utc', now())",
  })
  created_on: Date;

  @Column({ type: 'integer', nullable: true })
  created_by: number;

  @UpdateDateColumn({
    type: 'timestamp with time zone',
    default: () => "timezone('utc', now())",
  })
  last_updated_on: Date;

  @Column({ type: 'integer', nullable: true })
  updated_by: number;
}

@Entity()
export class BankStatements {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'bigint', unique: true })
  @Generated('increment')
  bank_statement_id: number;

  //This field needs to be changed as non-nullable field.
  @Column({ type: 'text', nullable: true })
  bank_statement_name?: string;

  @Column({ type: 'int' })
  company_id: number;

  @ManyToOne((type) => CompanyDetails)
  @JoinColumn([{ name: 'company_id', referencedColumnName: 'company_id' }])
  companyId: CompanyDetails;

  @Column({ type: 'bigint' })
  bank_account_id: number;

  @Column({ type: 'text', nullable: true })
  financial_institution?: string;

  @Column({ type: 'enum', enum: ['Open', 'Locked'], default: 'Open' })
  status: BankStatementStatus;

  @Column({ type: 'decimal', precision: 55, scale: 2 })
  bank_statement_balance: number;

  @Column({ type: 'simple-array', nullable: true })
  matched_payment_ids?: number[];

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

  @CreateDateColumn({
    type: 'timestamp with time zone',
    default: () => "timezone('utc', now())",
  })
  created_on: Date;

  @Column({ type: 'integer', nullable: true })
  created_by: number;

  @UpdateDateColumn({
    type: 'timestamp with time zone',
    default: () => "timezone('utc', now())",
  })
  updated_on: Date;

  @Column({ type: 'integer', nullable: true })
  updated_by: number;

  @Column({ type: 'text' })
  bank_statement_attachment_id: string;

  @Column({ type: 'date' })
  statement_date: Date;

  @AfterInsert()
  updateBankStatementId() {
    console.log(this.bank_statement_id);
  }
}

export const bankingEntitiesToInject = [
  BankAccounts,
  Transactions,
  BankStatements,
  PaymentClaims,
  PaymentClaimInvoices,
];
