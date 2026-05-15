import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'ai_billing_settings' })
export class AiBillingSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'integer', unique: true })
  company_id: number;

  @Column({ type: 'boolean', default: false })
  auto_topup_enabled: boolean;

  @Column({ type: 'decimal', precision: 13, scale: 2, default: 5.0 })
  low_balance_trigger_usd: string;

  @Column({ type: 'decimal', precision: 13, scale: 2, default: 20.0 })
  topup_amount_usd: string;

  @Column({ type: 'decimal', precision: 13, scale: 2, default: 100.0 })
  monthly_topup_cap_usd: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  stripe_payment_method_id: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  billing_email: string | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  last_topup_attempt_at: Date | null;

  @Column({ type: 'text', nullable: true })
  last_topup_failure_reason: string | null;

  @Column({ type: 'boolean', default: false })
  is_sandbox: boolean;

  @Column({ type: 'integer', nullable: true })
  created_by: number | null;

  @CreateDateColumn({
    type: 'timestamp with time zone',
    default: () => "timezone('utc', now())",
  })
  created_on: Date;

  @Column({ type: 'integer', nullable: true })
  updated_by: number | null;

  @UpdateDateColumn({
    type: 'timestamp with time zone',
    default: () => "timezone('utc', now())",
  })
  updated_on: Date;
}
