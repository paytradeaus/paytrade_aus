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

export type RetentionJournalKind = 'gross_up' | 'gross_up_reversal';
export type RetentionJournalStatus = 'POSTED' | 'DELETED' | 'VOIDED' | 'FAILED';

@Entity('xero_retention_journals')
@Index('idx_xero_retention_journals_claim', ['integration_id', 'pt_claim_id'])
@Index(
  'uq_xero_retention_journals_manual_journal_id',
  ['manual_journal_id'],
  { unique: true, where: '"manual_journal_id" IS NOT NULL' },
)
export class XeroRetentionJournals {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'integer' })
  integration_id: number;

  @Column({ type: 'uuid', nullable: true })
  tenant_id: string;

  @Column({ type: 'integer', nullable: true })
  pt_claim_id: number;

  @Column({ type: 'integer', nullable: true })
  pt_retention_id: number;

  @Column({ type: 'integer', nullable: true })
  pt_sub_payment_id: number;

  @Column({ type: 'uuid', nullable: true })
  invoice_id: string;

  @Column({ type: 'uuid', nullable: true })
  manual_journal_id: string;

  @Column({ type: 'varchar', length: 32 })
  kind: RetentionJournalKind;

  @Column({ type: 'varchar', length: 16, default: 'POSTED' })
  status: RetentionJournalStatus;

  @Column({ type: 'numeric', precision: 18, scale: 2, nullable: true })
  retention_ex_gst: number;

  @Column({ type: 'numeric', precision: 18, scale: 2, nullable: true })
  gst_amount: number;

  @Column({ type: 'varchar', length: 64, nullable: true })
  resolved_tax_type: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  resolution_source: string;

  @Column({ type: 'varchar', length: 1024, nullable: true })
  narration: string;

  @Column({ type: 'text', nullable: true })
  error_text: string;

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
