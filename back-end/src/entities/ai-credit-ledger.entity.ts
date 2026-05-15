import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

export type AiCreditEventType =
  | 'allocation'
  | 'rollover_zero'
  | 'consumption'
  | 'topup'
  | 'refund'
  | 'adjustment';

@Entity({ name: 'ai_credit_ledger' })
export class AiCreditLedger {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'integer' })
  company_id: number;

  @Column({
    type: 'enum',
    enum: [
      'allocation',
      'rollover_zero',
      'consumption',
      'topup',
      'refund',
      'adjustment',
    ],
  })
  event_type: AiCreditEventType;

  @Column({ type: 'decimal', precision: 13, scale: 4 })
  amount_usd: string;

  @Column({ type: 'decimal', precision: 13, scale: 4 })
  balance_before: string;

  @Column({ type: 'decimal', precision: 13, scale: 4 })
  balance_after: string;

  @Column({ type: 'decimal', precision: 13, scale: 6, nullable: true })
  raw_cost_usd: string | null;

  @Column({ type: 'decimal', precision: 8, scale: 4, nullable: true })
  multiplier: string | null;

  @Column({ type: 'uuid', nullable: true })
  purchase_id: string | null;

  @Column({ type: 'uuid', nullable: true })
  ai_run_id: string | null;

  @Column({ type: 'uuid', nullable: true })
  tool_call_id: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  stripe_payment_intent_id: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  idempotency_key: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'integer', nullable: true })
  created_by: number | null;

  @CreateDateColumn({
    type: 'timestamp with time zone',
    default: () => "timezone('utc', now())",
  })
  created_on: Date;
}
