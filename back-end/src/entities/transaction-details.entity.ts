import { TransactionStatus } from 'src/libs/@paytrade-types/paytrade-types';
import {
  Column,
  CreateDateColumn,
  Entity,
  Generated,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Group } from './user-details.entity';
import { SubPayments } from './sub-payments.entity';

export type DuplicateCheck = 'new' | 'file_duplicate' | 'db_duplicate';

@Entity()
export class TransactionDetails {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'bigint', unique: true })
  @Generated('increment')
  transaction_id: number;

  @Column({ type: 'bigint', nullable: true })
  bank_account_id: number;

  @Column({ type: 'bigint', nullable: true })
  company_id: number;

  @Column({
    type: 'enum',
    enum: ['To Review', 'Unmatched', 'Matched', 'Excluded', 'Deleted'],
    default: 'To Review',
  })
  status: TransactionStatus;

  @Column({ type: 'decimal', precision: 55, scale: 2, nullable: true })
  txn_amount: number;

  @Column({ type: 'timestamp with time zone', nullable: true })
  txn_date: Date;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 55, scale: 2, nullable: true })
  balance: number;

  @Column({ type: 'boolean', default: false, nullable: true })
  is_matched?: boolean;

  @Column({ type: 'simple-array', nullable: true })
  matched_payment_ids?: number[];

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
}

@Entity()
export class TempSaveTransactions {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'decimal', precision: 55, scale: 2, nullable: true })
  txn_amount: number;

  @Column({ type: 'timestamp with time zone', nullable: true })
  txn_date: Date;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 55, scale: 2, nullable: true })
  balance: number;

  @Column({
    type: 'enum',
    enum: ['new', 'file_duplicate', 'db_duplicate'],
    default: 'new',
    nullable: true,
  })
  duplicate_check: DuplicateCheck;

  @Column({ type: 'boolean', default: false })
  is_similar: boolean;

  // Task #233 — Authoritative closing balance read from the uploaded
  // CSV's preamble (e.g. NAB's `Closing balance: AUD 0.00 CR`). When
  // present, `addSelectedTransactions` uses this as the suggested
  // current balance instead of guessing from the transaction rows.
  @Column({ type: 'decimal', precision: 55, scale: 2, nullable: true })
  csv_closing_balance: number | null;

  // Task #233 — Original 0-based row index in the uploaded CSV. Used
  // as a deterministic tie-breaker when multiple transactions share
  // the same `txn_date`, so we can pick the truly-last row instead of
  // relying on Postgres' indeterminate same-key ordering.
  @Column({ type: 'integer', nullable: true })
  csv_row_index: number | null;
}
