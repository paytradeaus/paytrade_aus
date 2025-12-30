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
import {
  BeneficiaryType,
  RetentionListStatus,
} from 'src/libs/@paytrade-types/paytrade-types';
import { PaymentDetails } from './payment-details.entity';
import { SubPayments } from './sub-payments.entity';

@Entity()
export class RetentionDetails {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'bigint', unique: true })
  @Generated('increment')
  retention_id: number;

  @Column({ type: 'bigint' })
  sub_payment_id: number;

  @Column({ type: 'bigint' })
  payment_id: number;

  @Column({ type: 'decimal', precision: 55, scale: 2 })
  retained_amount: number;

  @Column({
    type: 'enum',
    enum: [
      'Retained',
      'Claim generated',
      'Claim completed',
      'Payment generated',
      'Completed',
      'Deleted',
    ],
    default: 'Retained',
  })
  retention_status: RetentionListStatus;

  @Column({ type: 'bigint', nullable: true })
  client_supplier_id: number;

  @Column({
    type: 'enum',
    enum: ['Current supplier', 'Other supplier', 'Self'],
    nullable: true,
  })
  beneficiary_type: BeneficiaryType;

  @Column({ type: 'bigint', nullable: true })
  company_id: number;

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

  @ManyToOne(() => PaymentDetails, (retention) => retention.retentionDetails)
  @JoinColumn({
    name: 'payment_id',
    referencedColumnName: 'payment_id',
  })
  paymentDetails?: PaymentDetails;

  @ManyToOne(() => SubPayments, (retention) => retention.retentionDetails)
  @JoinColumn({
    name: 'sub_payment_id',
    referencedColumnName: 'sub_payment_id',
  })
  subPayments?: SubPayments;

  @AfterInsert()
  updateRetentionId() {
    console.log(this.retention_id);
  }
}
