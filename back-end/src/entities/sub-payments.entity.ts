import {
  AfterInsert,
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
import {
  PaymentStatuses,
  SubPaymentTypes,
} from 'src/libs/@paytrade-types/paytrade-types';
import { PaymentDetails } from './payment-details.entity';
import { RetentionDetails } from './retention-details.entity';
import { TransactionDetails } from './transaction-details.entity';
import { RetentionSummaryDetails } from './retention-summary.entity';
import { GenerateABAFileHistory } from './generate-aba-history.entity';

@Entity()
export class SubPayments {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'bigint', unique: true })
  @Generated('increment')
  sub_payment_id: number;

  @Column({ type: 'bigint' })
  payment_id: number;

  @Column({
    type: 'enum',
    enum: ['Payment', 'Retention', 'Retention Out', 'Retention In'],
    nullable: true,
  })
  sub_payment_type: SubPaymentTypes;

  @Column({ type: 'decimal', precision: 55, scale: 2 })
  amount: number;

  @Column({
    type: 'enum',
    enum: ['Unmatched', 'Matched', 'Auto matched'],
    default: 'Unmatched',
  })
  status: PaymentStatuses;

  @Column({ nullable: true })
  is_paid_confirmed: Boolean;

  @Column({ nullable: true })
  is_received_confirmed: Boolean;

  @Column({ nullable: true })
  is_retention_confirmed: Boolean;

  @Column({ type: 'simple-array', nullable: true })
  matched_transactions?: string[];

  @ManyToMany((type) => TransactionDetails, {
    nullable: true,
  })
  @JoinColumn({
    name: 'matched_transactions',
    referencedColumnName: 'id',
  })
  transaction: TransactionDetails[];

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

  @ManyToOne(() => PaymentDetails, (payment) => payment.subPayments)
  @JoinColumn({
    name: 'payment_id',
    referencedColumnName: 'payment_id',
  })
  paymentDetails?: PaymentDetails;

  @OneToMany(
    () => RetentionSummaryDetails,
    (retentionSummary) => retentionSummary.subPayments,
  )
  @JoinColumn({
    name: 'sub_payment_id',
    referencedColumnName: 'sub_payment_id',
  })
  retentionSummaryDetails: RetentionSummaryDetails;

  @OneToMany(() => RetentionDetails, (payment) => payment.subPayments)
  retentionDetails: RetentionDetails[];

  // Task #286 — link back to the ABA batch this sub-payment was
  // included in. Populated at ABA generation time; NULL for
  // pre-Task-#286 rows (legacy batches show a fallback message).
  @Column({ type: 'uuid', nullable: true })
  aba_history_id: string | null;

  @ManyToOne(() => GenerateABAFileHistory, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'aba_history_id', referencedColumnName: 'id' })
  abaHistory?: GenerateABAFileHistory;

  @AfterInsert()
  updateSubPaymentId() {
    console.log(this.sub_payment_id);
  }
}
