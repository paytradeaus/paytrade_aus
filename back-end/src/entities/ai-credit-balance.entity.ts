import {
  Entity,
  Column,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'ai_credit_balances' })
export class AiCreditBalance {
  @PrimaryColumn({ type: 'integer' })
  company_id: number;

  @Column({ type: 'decimal', precision: 13, scale: 4, default: 0 })
  balance_usd: string;

  @Column({ type: 'timestamp with time zone', nullable: true })
  last_allocation_at: Date | null;

  /** YYYY-MM marker so we can detect duplicate allocations for the same period. */
  @Column({ type: 'varchar', length: 7, nullable: true })
  last_allocation_period: string | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  last_event_at: Date | null;

  @UpdateDateColumn({
    type: 'timestamp with time zone',
    default: () => "timezone('utc', now())",
  })
  updated_on: Date;
}
