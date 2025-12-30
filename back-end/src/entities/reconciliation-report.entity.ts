import {
  AfterInsert,
  Column,
  CreateDateColumn,
  Entity,
  Generated,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Group } from './user-details.entity';
import { CompanyDetails } from './company-details.entity';
import { BankAccounts } from './banking.entity';
import {
  ReconcileStatus,
  ReportStatus,
} from 'src/libs/@paytrade-types/paytrade-types';

@Entity()
export class ReconciliationReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'integer', unique: true })
  @Generated('increment')
  report_id: number;

  @Column({ type: 'int' })
  company_id: number;

  @Column({ type: 'date' })
  month_end_date: Date;

  @Column({ type: 'bigint' })
  bank_account_id: number;

  @Column({ type: 'decimal', precision: 55, scale: 2 })
  bank_statement_balance: number;

  @Column({ type: 'decimal', precision: 55, scale: 2, default: 0.0 })
  adjustments: number;

  @Column({ type: 'text', nullable: true })
  adjustment_comment: string;

  @Column({ type: 'decimal', precision: 55, scale: 2 })
  expected_balance: number;

  @Column({ type: 'decimal', precision: 55, scale: 2 })
  deposit_withdrawal_balance: number;

  @Column({ type: 'decimal', precision: 55, scale: 2 })
  account_ledger_balance: number;

  @Column({
    type: 'enum',
    enum: ['Balanced', 'Unbalanced'],
    default: 'Unbalanced',
  })
  reconcile_status: ReconcileStatus;

  @Column({
    type: 'enum',
    enum: ['Active', 'Deleted'],
    default: 'Active',
  })
  report_status: ReportStatus;

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

  @ManyToOne(() => CompanyDetails, (company) => company.reportDetails)
  @JoinColumn({ name: 'company_id', referencedColumnName: 'company_id' })
  companyDetails?: CompanyDetails;

  @ManyToOne(() => BankAccounts, (bankAccount) => bankAccount.reportDetails)
  @JoinColumn({
    name: 'bank_account_id',
    referencedColumnName: 'bank_account_id',
  })
  bankAccounts?: BankAccounts;

  @AfterInsert()
  updateReportId() {
    console.log(this.report_id);
  }
}
