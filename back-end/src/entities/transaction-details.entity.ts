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
}
