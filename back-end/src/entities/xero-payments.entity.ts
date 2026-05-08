import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { Group } from './user-details.entity';
import { XeroIntegrationDetails } from './xero-integration-details.entity';
import { MappedStatus } from 'src/libs/@paytrade-types/paytrade-types';
import { XeroContactDetails } from './xero-contact-details.entity';
import { PaymentClaims } from './banking.entity';
import { XeroInvoicesBills } from './xero-invoices-bills.entity';
import { XeroBankAccountDetails } from './xero-bank-account-details.entity';
import { PaymentDetails } from './payment-details.entity';

@Entity()
export class XeroPayments {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  payment_id: string;

  @Column({ type: 'integer' })
  integration_id: number;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'uuid' })
  contact_id: string;

  @Column({ type: 'uuid', nullable: true })
  invoice_id: string;

  @Column({ type: 'uuid', nullable: true })
  account_id: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  payment_type: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  status: string;

  @Column({ type: 'date', nullable: true })
  payment_date: Date;

  @Column({ type: 'text', nullable: true })
  reference: string;

  @Column({ type: 'decimal', precision: 55, scale: 2, nullable: true })
  payment_amount: number;

  @Column({ type: 'decimal', precision: 55, scale: 2, nullable: true })
  bank_amount: number;

  @Column({ nullable: true })
  is_reconciled: boolean;

  @Column({ type: 'uuid', nullable: true })
  bank_transfer_id: string;

  // Task #50 — Reference stamped on the Xero BankTransfer when PT
  // pushed it (`PT-RET-{pt_payment_id}`). Used by the inbound matcher
  // for a fast reference round-trip shortcut.
  @Column({ type: 'text', nullable: true })
  bank_transfer_reference: string;

  @Column({ type: 'uuid', nullable: true })
  overpayment_id: string;

  @Column({ type: 'uuid', array: true, nullable: true })
  overpayment_refund_id: string[];

  @Column({ type: 'uuid', nullable: true })
  credit_note_id: string;

  @Column({ type: 'uuid', nullable: true })
  credit_note_allocation_id: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  credit_note_type: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  credit_note_status: string;

  @Column({ type: 'decimal', precision: 55, scale: 2, nullable: true })
  credit_amount: number;

  @Column({ type: 'date', nullable: true })
  credit_note_date: Date;

  @Column({ nullable: true })
  is_under_payment: boolean;

  @Column({ type: 'enum', enum: ['Manual', 'Auto', 'System'], nullable: true })
  mapped_status: MappedStatus;

  @Column({ type: 'bigint', nullable: true })
  pt_payment_id: number;

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

  @ManyToOne(() => XeroIntegrationDetails, (payment) => payment.xeroPayments)
  @JoinColumn({
    name: 'integration_id',
    referencedColumnName: 'integration_id',
  })
  xeroIntegrationDetails: XeroIntegrationDetails;

  @ManyToOne(() => PaymentDetails, (payment) => payment.xeroPayments)
  @JoinColumn({ name: 'pt_payment_id', referencedColumnName: 'payment_id' })
  paymentDetails: PaymentDetails;

  @ManyToOne(() => XeroContactDetails, (invoice) => invoice.xeroPayments)
  @JoinColumn({
    name: 'contact_id',
    referencedColumnName: 'id',
  })
  xeroContactDetails: XeroContactDetails;

  @ManyToOne(() => XeroInvoicesBills, (invoice) => invoice.xeroPayments)
  @JoinColumn({
    name: 'invoice_id',
    referencedColumnName: 'id',
  })
  xeroInvoicesBills: XeroInvoicesBills;

  @ManyToOne(() => XeroBankAccountDetails, (account) => account.xeroPayments)
  @JoinColumn({
    name: 'account_id',
    referencedColumnName: 'id',
  })
  xeroBankAccountDetails: XeroBankAccountDetails;
}
