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
  RetentionSummaryStatus,
} from 'src/libs/@paytrade-types/paytrade-types';
import { SubPayments } from './sub-payments.entity';

@Entity()
export class RetentionSummaryDetails {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'bigint', unique: true })
  @Generated('increment')
  retention_summary_id: number;

  @Column({ type: 'bigint' })
  retention_id: number;

  @Column({ type: 'text', nullable: true })
  retained_account_name: string;

  @Column({ type: 'bigint' })
  sub_payment_id: number;

  @Column({ type: 'int', nullable: true })
  event_id: number;

  @Column({ type: 'decimal', precision: 55, scale: 2, nullable: true })
  amount: number;

  @Column({
    type: 'enum',
    enum: ['Retained', 'Completed', 'Deleted'],
  })
  status: RetentionSummaryStatus;

  @Column({ type: 'bigint', nullable: true })
  client_supplier_id: number;

  @Column({
    type: 'enum',
    enum: ['Current supplier', 'Other supplier', 'Self'],
  })
  beneficiary_type: BeneficiaryType;

  @Column({ type: 'text', nullable: true })
  beneficiary_name: string;

  @Column({ type: 'bigint', nullable: true })
  company_id: number;

  @Column({
    type: 'decimal',
    precision: 55,
    scale: 2,
    nullable: true,
  })
  payment_amount: number;

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

  @ManyToOne(
    () => SubPayments,
    (subPayment) => subPayment.retentionSummaryDetails,
  )
  @JoinColumn({
    name: 'sub_payment_id',
    referencedColumnName: 'sub_payment_id',
  })
  subPayments: SubPayments;

  @AfterInsert()
  updateSubPaymentId() {
    console.log(this.sub_payment_id);
  }
}
