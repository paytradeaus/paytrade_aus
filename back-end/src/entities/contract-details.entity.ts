import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  PrimaryColumn,
  ManyToOne,
  JoinColumn,
  Generated,
  AfterInsert,
  OneToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CompanyDetails } from './company-details.entity';
import { ProjectDetails } from './project-details.entity';
import { ClientSuppliersDetails } from './client-suppliers-details.entity';
import { FileAttachments } from './file-attachments.entity';
import { VariationDetails } from './variation-details.entity';
import { Group } from './user-details.entity';
import { BankAccounts, PaymentClaims } from './banking.entity';
import { PaymentDetails } from './payment-details.entity';
import { NoticeDetails } from './notices-details.entity';
import { JournalEntries } from './journal-entries.entity';
import { XeroContractDetails } from './xero-contract-details.entity';
export type ContractStatus =
  | 'Draft'
  | 'In Progress'
  | 'Completed'
  | 'Archived'
  | 'Deleted';
export type ClientSupplierRole =
  | 'Principal'
  | 'Head Contractor'
  | 'Related Entity Sub Contractor'
  | 'Sub Contractor';
// | 'Sub sub contractor';
export type RetentionType = 'Cash' | 'Bank guaranteed' | 'None';

@Entity()
export class ContractDetails {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'integer', unique: true })
  @Generated('increment')
  contract_id: number;

  @PrimaryColumn({ type: 'int' })
  company_id: number;

  @Column({ type: 'varchar', length: 150 })
  contract_name: string;

  @Column({
    type: 'enum',
    enum: [
      'Principal',
      'Head Contractor',
      'Related Entity Sub Contractor',
      'Sub Contractor',
      // 'Sub sub contractor',
    ],
    nullable: true,
  })
  client_supplier_role: ClientSupplierRole;

  @Column({ type: 'varchar', length: 100, nullable: true })
  contract_type: string;

  @Column({
    type: 'enum',
    enum: ['Draft', 'In Progress', 'Completed', 'Archived', 'Deleted'],
    default: 'Draft',
    nullable: true,
  })
  contract_status: ContractStatus;

  @Column({ type: 'date', nullable: true })
  contract_date: Date;

  @Column({ type: 'int', nullable: true })
  project_id: number;

  @Column({ type: 'int', nullable: true })
  client_supplier_id: number;

  @Column({
    type: 'enum',
    enum: ['Cash', 'Bank guaranteed', 'None'],
    nullable: true,
  })
  retention_type: RetentionType;

  @Column({ type: 'int', nullable: true })
  payment_terms: number;

  @Column({ type: 'decimal', precision: 13, scale: 2, nullable: true })
  initial_contract_sum: number;

  @Column({ nullable: true })
  attachment_id: string;

  @Column({ type: 'date', nullable: true })
  contract_start_date: Date;

  @Column({ type: 'date', nullable: true })
  defect_liability_end_date: Date;

  @Column({ type: 'bigint', nullable: true })
  payment_from_account: number;

  @Column({ type: 'bigint', nullable: true })
  retention_from_account: number;

  @Column({ type: 'bigint', nullable: true })
  payment_to_account: number;

  @Column({
    type: 'enum',
    enum: ['Draft', 'In Progress', 'Completed', 'Archived', 'Deleted'],
    nullable: true,
  })
  previous_status: ContractStatus;

  @Column({ name: 'notice_generated', type: 'boolean', default: false })
  notice_generated: boolean;

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

  @ManyToOne(() => CompanyDetails, (company) => company.contractDetails)
  @JoinColumn({ name: 'company_id', referencedColumnName: 'company_id' })
  companyDetails: CompanyDetails;

  @ManyToOne(() => ProjectDetails, (project) => project.contractDetails)
  @JoinColumn({ name: 'project_id', referencedColumnName: 'project_id' })
  projectDetails: ProjectDetails;

  @ManyToOne(() => ClientSuppliersDetails, (client) => client.contractDetails)
  @JoinColumn({
    name: 'client_supplier_id',
    referencedColumnName: 'client_supplier_id',
  })
  clientSuppliersDetails: ClientSuppliersDetails;

  @OneToOne(() => FileAttachments, (file) => file.contractDetails)
  @JoinColumn({ name: 'attachment_id', referencedColumnName: 'id' })
  fileAttachments: FileAttachments;

  @OneToMany(() => VariationDetails, (variation) => variation.contractDetails)
  variationDetails: VariationDetails[];

  @OneToMany(() => NoticeDetails, (notice) => notice.contractDetails)
  noticeDetails: NoticeDetails[];

  @OneToMany(
    () => PaymentClaims,
    (paymentClaim) => paymentClaim.contractDetails,
  )
  paymentClaims: PaymentClaims[];

  @OneToMany(() => PaymentDetails, (company) => company.contractDetails)
  paymentDetails: PaymentDetails[];

  @ManyToOne(
    () => BankAccounts,
    (bankAccount) => bankAccount.contractPaymentFrom,
    {
      nullable: true,
    },
  )
  @JoinColumn({
    name: 'payment_from_account',
    referencedColumnName: 'bank_account_id',
  })
  contractPaymentFromAccount?: BankAccounts;

  @ManyToOne(
    () => BankAccounts,
    (bankAccount) => bankAccount.contractPaymentTo,
    {
      nullable: true,
    },
  )
  @JoinColumn({
    name: 'payment_to_account',
    referencedColumnName: 'bank_account_id',
  })
  contractPaymentToAccount?: BankAccounts;

  @ManyToOne(
    () => BankAccounts,
    (bankAccount) => bankAccount.contractRetentionAccount,
    {
      nullable: true,
    },
  )
  @JoinColumn({
    name: 'retention_from_account',
    referencedColumnName: 'bank_account_id',
  })
  contractRetentionFromAccount?: BankAccounts;

  @OneToMany(() => JournalEntries, (journal) => journal.contractDetails)
  journalEntries: JournalEntries[];

  @OneToMany(() => XeroContractDetails, (contract) => contract.contractDetails)
  xeroContractDetails: XeroContractDetails[];

  @AfterInsert()
  updateContractId() {
    console.log(this.contract_id);
  }
}
