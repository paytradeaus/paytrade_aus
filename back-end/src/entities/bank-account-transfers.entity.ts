import {
  Column,
  CreateDateColumn,
  Entity,
  Generated,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TrustAccountTransferStatus } from 'src/libs/@paytrade-types/paytrade-types';
import { BankAccounts } from './banking.entity';
import { CompanyDetails } from './company-details.entity';

/**
 * Task #244 — State machine for an in-flight trust-account transfer
 * (PTA→PTA or RTA→RTA). The wizard creates one of these rows + a
 * companion `payment_details` row of type 'Inter Trust Transfer' the
 * moment the user finishes the wizard. The transfer sits `Pending`
 * until one of three triggers fires:
 *   1. The user explicitly confirms the payment in the UI.
 *   2. A reconciled bank line on the destination matches the payment.
 *   3. A Xero BankTransfer webhook matches the payment.
 * On any trigger, `confirmTrustAccountTransfer` runs a single atomic
 * cutover transaction (repoint contract pointers, migrate open
 * retention, migrate in-flight items, write journals on both legs,
 * flip source status to 'Transferred', fire the combined notice
 * batch). Any throw rolls the whole thing back and lands the row in
 * `Failed` with `last_error` populated — re-fireable via the admin
 * retry mutation. See `.local/tasks/task-244.md` for the full spec.
 */
@Entity({ name: 'bank_account_transfers' })
@Index(['company_id', 'status'])
@Index(['source_bank_account_id', 'status'])
@Index(['transfer_payment_id'])
@Index(['bank_transfer_reference'])
export class BankAccountTransfers {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'bigint', unique: true })
  @Generated('increment')
  transfer_id: number;

  @Column({ type: 'int' })
  company_id: number;

  @ManyToOne(() => CompanyDetails)
  @JoinColumn({ name: 'company_id', referencedColumnName: 'company_id' })
  companyDetails?: CompanyDetails;

  @Column({ type: 'bigint' })
  source_bank_account_id: number;

  @ManyToOne(() => BankAccounts)
  @JoinColumn({
    name: 'source_bank_account_id',
    referencedColumnName: 'bank_account_id',
  })
  sourceBankAccount?: BankAccounts;

  @Column({ type: 'bigint' })
  destination_bank_account_id: number;

  @ManyToOne(() => BankAccounts)
  @JoinColumn({
    name: 'destination_bank_account_id',
    referencedColumnName: 'bank_account_id',
  })
  destinationBankAccount?: BankAccounts;

  @Column({ type: 'date' })
  transfer_date: Date;

  @Column({ type: 'decimal', precision: 13, scale: 2 })
  amount: number;

  @Column({
    type: 'enum',
    enum: ['Pending', 'Confirmed', 'CutoverApplied', 'Cancelled', 'Failed'],
    default: 'Pending',
  })
  status: TrustAccountTransferStatus;

  // The companion 'Inter Trust Transfer' payment created by the
  // wizard. Set when the wizard creates the transfer; never changed.
  @Column({ type: 'bigint', nullable: true })
  transfer_payment_id: number;

  // For PT-originated transfers we set this to `PT-XFER-{transfer_id}`
  // so the Xero BankTransfer matcher rejects the inbound echo. For
  // transfers detected from Xero first, the matcher writes the Xero
  // reference here when the user adopts it.
  @Column({ type: 'text', nullable: true })
  bank_transfer_reference: string;

  // Per-open-item user choices from the wizard preflight step. Shape:
  //   { open_claims: { [payment_claim_id]: 'carry' | 'settle' | 'exclude' },
  //     in_flight_payments: { [payment_id]: 'carry' | 'settle' | 'exclude' },
  //     open_retention: { [retention_id]: 'carry' | 'release' | 'exclude' } }
  // Read by the atomic cutover step to decide what to migrate.
  @Column({ type: 'jsonb', nullable: true, default: () => "'{}'" })
  carry_across_choices: Record<string, any>;

  // Populated only when a cutover attempt threw mid-transaction. Cleared
  // when the admin retry succeeds.
  @Column({ type: 'text', nullable: true })
  last_error: string;

  @Column({ type: 'timestamp with time zone', nullable: true })
  cutover_applied_at: Date;

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
}
