import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Group } from './user-details.entity';
import { XeroIntegrationDetails } from './xero-integration-details.entity';

/**
 * Consumption ledger for inbound Xero BankTransfers.
 *
 * Replaces the old 1:1 `xero_payments.bank_transfer_id` assumption so a
 * single Xero BankTransfer can be applied (in part or whole) across many
 * PayTrade payments (BULK: 1 transfer -> N retentions) and many transfers
 * can be applied to a single PayTrade payment (SPLIT: ex-GST leg + GST leg
 * -> 1 retention). Each row records how much of one transfer was applied to
 * one PT payment, so cumulative coverage can be computed before any
 * `is_retention_confirmed` tick (accumulate-then-tick) and no transfer's
 * dollars are ever applied twice.
 */
export type TransferApplicationKind = 'retention' | 'movement';

@Entity('xero_transfer_applications')
@Index('idx_xero_transfer_applications_transfer', [
  'integration_id',
  'bank_transfer_id',
])
@Index('idx_xero_transfer_applications_payment', [
  'integration_id',
  'pt_payment_id',
])
@Index(
  'uq_xero_transfer_applications_transfer_payment',
  ['bank_transfer_id', 'pt_payment_id'],
  { unique: true },
)
export class XeroTransferApplications {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'integer' })
  integration_id: number;

  @Column({ type: 'uuid', nullable: true })
  tenant_id: string;

  @Column({ type: 'uuid' })
  bank_transfer_id: string;

  @Column({ type: 'integer' })
  pt_payment_id: number;

  @Column({ type: 'varchar', length: 32 })
  kind: TransferApplicationKind;

  @Column({ type: 'numeric', precision: 18, scale: 2 })
  amount_applied: number;

  @Column({ type: 'varchar', length: 1024, nullable: true })
  notes: string;

  @ManyToOne(() => XeroIntegrationDetails, { nullable: true })
  @JoinColumn({ name: 'integration_id', referencedColumnName: 'integration_id' })
  integrationDetails: XeroIntegrationDetails;

  @CreateDateColumn()
  created_on: Date;

  @Column({ type: 'integer', nullable: true })
  created_by: number;

  @Column({
    type: 'enum',
    enum: ['SYSTEM', 'USER', 'ADMIN'],
    default: 'SYSTEM',
    nullable: true,
  })
  created_group: Group;

  @UpdateDateColumn({ nullable: true })
  updated_on: Date;

  @Column({ type: 'integer', nullable: true })
  updated_by: number;

  @Column({
    type: 'enum',
    enum: ['SYSTEM', 'USER', 'ADMIN'],
    nullable: true,
  })
  updated_group: Group;
}
