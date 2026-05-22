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
import { Group } from './user-details.entity';
import { CompanyDetails } from './company-details.entity';
import { ProjectDetails } from './project-details.entity';
import { ContractDetails } from './contract-details.entity';
import { BankAccounts, PaymentClaims } from './banking.entity';
import { ClientSuppliersDetails } from './client-suppliers-details.entity';
import { PaymentTypes } from 'src/libs/@paytrade-types/paytrade-types';
import { SubPayments } from './sub-payments.entity';
import { RetentionDetails } from './retention-details.entity';
import { FileAttachments } from './file-attachments.entity';
import { NoticeDetails } from './notices-details.entity';
import { XeroPayments } from './xero-payments.entity';

@Entity()
export class PaymentDetails {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'bigint', unique: true })
  @Generated('increment')
  payment_id: number;

  @Column({ type: 'int' })
  company_id: number;

  @Column({ type: 'int', nullable: true })
  payment_claim_id: number;

  @Column({ type: 'int', nullable: true })
  project_id: number;

  @Column({ type: 'int', nullable: true }) //needed for other payments?
  contract_id: number;

  @Column({ type: 'int', nullable: true })
  client_supplier_id: number;

  @Column({
    type: 'enum',
    enum: [
      'Full',
      'Part',
      'Pay Less - Full',
      'Pay Less - Part',
      'Pay - Zero',
      '3rd Party',
      'Interest Received',
      'Interest Withdrawal',
      'Bank Charge Applied',
      'Bank Charge Top Up',
      'Top Up',
      'Withdrawal',
      'Overpayment refund from supplier',
      'Overpayment refund to client',
      'Overpayment to supplier',
      'Underpayment to supplier',
      'Overpayment from client',
      'Underpayment from client',
      'Top Up Retention',
      'Inter Trust Transfer',
    ],
    nullable: true,
  })
  payment_type: PaymentTypes;

  @Column({ default: false })
  cash_retention: Boolean;

  @Column({ type: 'bigint', nullable: true })
  payment_from_account: number;

  @Column({ type: 'bigint', nullable: true })
  payment_to_account: number;

  @Column({ type: 'bigint', nullable: true })
  retention_account: number;

  @Column({ type: 'bigint', nullable: true })
  retention_id: number;

  @Column({ nullable: true })
  previous_status: string;

  @Column({ default: 'Unconfirmed - Unmatched' })
  current_status: string;

  @Column({ type: 'text', nullable: true })
  list_status: string;

  @Column({ type: 'decimal', precision: 55, scale: 2, nullable: true })
  payless_amount: number;

  @Column({ type: 'decimal', precision: 55, scale: 2, nullable: true })
  total_amount: number;

  @Column({ type: 'date', nullable: true })
  payment_date: Date;

  @CreateDateColumn({
    type: 'date',
    default: () => 'CURRENT_DATE',
  })
  input_date: Date;

  @Column({ type: 'date', nullable: true })
  retention_release_date: Date;

  @Column({ type: 'text', nullable: true })
  memo: string;

  @Column({ type: 'text', nullable: true })
  third_party_payment_reason: string;

  @Column({ type: 'text', nullable: true })
  withhold_payment_reason: string;

  @Column({ type: 'simple-array', nullable: true })
  compulsory_attachment_ids?: string[];

  @Column({ type: 'simple-array', nullable: true })
  optional_attachment_ids?: string[];

  @Column({ type: 'json', nullable: true, default: '{}' })
  payment_list_buttons: JSON;

  @Column({ type: 'json', nullable: true, default: '{}' })
  payment_overview_buttons: JSON;

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

  @ManyToOne(() => CompanyDetails, (company) => company.paymentDetails)
  @JoinColumn({ name: 'company_id', referencedColumnName: 'company_id' })
  companyDetails?: CompanyDetails;

  @ManyToOne(() => ProjectDetails, (project) => project.paymentDetails)
  @JoinColumn({ name: 'project_id', referencedColumnName: 'project_id' })
  projectDetails?: ProjectDetails;

  @ManyToOne(() => ContractDetails, (contract) => contract.paymentDetails)
  @JoinColumn({ name: 'contract_id', referencedColumnName: 'contract_id' })
  contractDetails?: ContractDetails;

  @ManyToOne(() => PaymentClaims, (paymentClaim) => paymentClaim.paymentDetails)
  @JoinColumn({
    name: 'payment_claim_id',
    referencedColumnName: 'payment_claim_id',
  })
  paymentClaims?: PaymentClaims;

  @ManyToOne(
    () => ClientSuppliersDetails,
    (clientAndSupplier) => clientAndSupplier.paymentDetails,
  )
  @JoinColumn({
    name: 'client_supplier_id',
    referencedColumnName: 'client_supplier_id',
  })
  clientSupplierDetails?: ClientSuppliersDetails;

  @ManyToOne(() => BankAccounts, (bankAccount) => bankAccount.paymentFrom, {
    nullable: true,
  })
  @JoinColumn({
    name: 'payment_from_account',
    referencedColumnName: 'bank_account_id',
  })
  paymentFromAccount?: BankAccounts;

  @ManyToOne(() => BankAccounts, (bankAccount) => bankAccount.paymentTo, {
    nullable: true,
  })
  @JoinColumn({
    name: 'payment_to_account',
    referencedColumnName: 'bank_account_id',
  })
  paymentToAccount?: BankAccounts;

  @ManyToOne(
    () => BankAccounts,
    (bankAccount) => bankAccount.retentionAccount,
    {
      nullable: true,
    },
  )
  @JoinColumn({
    name: 'retention_account',
    referencedColumnName: 'bank_account_id',
  })
  retentionAccount?: BankAccounts;

  @OneToMany(() => SubPayments, (subPayment) => subPayment.paymentDetails)
  subPayments: SubPayments[];

  @ManyToOne((type) => PaymentDetails)
  @JoinColumn([
    {
      name: 'associated_payment_id',
      referencedColumnName: 'payment_id',
    },
  ])
  associatedPayment: PaymentDetails;

  @ManyToOne((type) => PaymentDetails)
  @JoinColumn([
    {
      name: 'associated_overpayment_id',
      referencedColumnName: 'payment_id',
    },
  ])
  associatedOverPayment: PaymentDetails;

  @OneToMany(() => NoticeDetails, (subPayment) => subPayment.paymentDetails)
  noticeDetails: NoticeDetails[];

  @OneToMany(() => RetentionDetails, (payment) => payment.paymentDetails)
  retentionDetails: RetentionDetails[];

  @ManyToMany(
    (type) => FileAttachments,
    (file) => file.compulsoryPaymentDetails,
  )
  @JoinColumn([
    { name: 'compulsory_attachment_ids', referencedColumnName: 'id' },
  ])
  compulsoryFileAttachments: FileAttachments[];

  @ManyToMany((type) => FileAttachments, (file) => file.optionalPaymentDetails)
  @JoinColumn([{ name: 'optional_attachment_ids', referencedColumnName: 'id' }])
  optionalFileAttachments: FileAttachments[];

  @Column({ name: 'notice_generated', type: 'boolean', default: false })
  notice_generated: boolean;

  // Task #244 — when this payment is the money-movement leg of a Trust
  // Account Transfer (payment_type='Inter Trust Transfer'), this links
  // back to the `bank_account_transfers` wizard record that owns it.
  // NULL on every other payment_type. The transfer's lifecycle and the
  // atomic cutover transaction key off this id.
  @Column({ type: 'bigint', nullable: true })
  trust_account_transfer_id: number;

  // Task #244 — anti-echo + Xero matching reference. For PT-originated
  // transfers we set this to `PT-XFER-{transfer_id}` so the inbound
  // Xero BankTransfer matcher will reject the echo and avoid creating a
  // duplicate. For transfers the user creates inside Xero first, the
  // matcher copies the Xero reference here when adopting the transfer.
  @Column({ type: 'text', nullable: true })
  bank_transfer_reference: string;

  @OneToMany(() => XeroPayments, (payment) => payment.paymentDetails)
  xeroPayments: XeroPayments[];

  @AfterInsert()
  updatePaymentId() {
    console.log(this.payment_id);
  }
}
