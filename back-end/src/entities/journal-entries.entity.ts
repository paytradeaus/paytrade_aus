import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Generated,
  PrimaryColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Group } from './user-details.entity';
import { CompanyDetails } from './company-details.entity';
import { JournalType } from './journal-type.entity';
import { ProjectDetails } from './project-details.entity';
import { ContractDetails } from './contract-details.entity';
import { ClientSuppliersDetails } from './client-suppliers-details.entity';
import { BankAccounts } from './banking.entity';

@Entity()
export class JournalEntries {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @PrimaryColumn({ type: 'integer', unique: true })
  @Generated('increment')
  journal_system_ref: number;

  @Column({ type: 'int' })
  company_id: number;

  @Column({ type: 'int', nullable: true })
  project_id: number;

  @Column({ type: 'int', nullable: true })
  contract_id: number;

  @Column({ type: 'int', nullable: true })
  supplier_id: number;

  @Column({ type: 'int' })
  bank_account_id: number;

  @Column({ type: 'int' })
  journal_number: number;

  @Column({ type: 'int', nullable: true })
  activity_id: number;

  @Column({ type: 'bigint', nullable: true })
  audit_id: number;

  @Column({ type: 'varchar', length: 50 })
  journal_suffix: string;

  @Column({ type: 'varchar', length: 50 })
  activity_suffix: string;

  @Column({
    type: 'date',
    default: () => 'CURRENT_DATE',
  })
  journal_date: Date;

  @Column({ type: 'varchar', length: 500 }) //need to remove
  journal_description: string;

  @Column({ type: 'json', nullable: true })
  dynamic_values: Record<string, any>;

  @Column({ type: 'int', nullable: true })
  transaction_account_id: number;

  @Column({ type: 'decimal', precision: 55, scale: 2, nullable: true })
  debit_amount: number;

  @Column({ type: 'decimal', precision: 55, scale: 2, nullable: true })
  credit_amount: number;

  @Column({ type: 'decimal', precision: 55, scale: 2, nullable: true })
  balance_amount: number;

  @Column({ type: 'int' })
  journal_process_id: number;

  @Column({ type: 'varchar', length: 50 })
  entry_type: string;

  @Column({ default: false })
  is_reversed: Boolean;

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

  @ManyToOne(() => CompanyDetails, (company) => company.journalEntries)
  @JoinColumn({ name: 'company_id', referencedColumnName: 'company_id' })
  companyDetails?: CompanyDetails;

  @ManyToOne(() => ProjectDetails, (project) => project.journalEntries)
  @JoinColumn({ name: 'project_id', referencedColumnName: 'project_id' })
  projectDetails?: ProjectDetails;

  @ManyToOne(() => ContractDetails, (contract) => contract.journalEntries)
  @JoinColumn({ name: 'contract_id', referencedColumnName: 'contract_id' })
  contractDetails?: ContractDetails;

  @ManyToOne(
    () => ClientSuppliersDetails,
    (supplier) => supplier.journalEntries,
  )
  @JoinColumn({
    name: 'supplier_id',
    referencedColumnName: 'client_supplier_id',
  })
  clientSupplierDetails?: ClientSuppliersDetails;

  @ManyToOne(() => BankAccounts, (account) => account.journalEntries)
  @JoinColumn({
    name: 'bank_account_id',
    referencedColumnName: 'bank_account_id',
  })
  accountDetails?: BankAccounts;

  @ManyToOne(() => BankAccounts, (account) => account.txnJournalEntries)
  @JoinColumn({
    name: 'transaction_account_id',
    referencedColumnName: 'bank_account_id',
  })
  txnAccountDetails?: BankAccounts;

  @ManyToOne(() => JournalType, (journal) => journal.journalEntries)
  @JoinColumn({
    name: 'journal_process_id',
    referencedColumnName: 'process_id',
  })
  journalType?: JournalType;
}
