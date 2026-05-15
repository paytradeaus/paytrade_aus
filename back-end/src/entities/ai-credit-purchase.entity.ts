import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type AiCreditPurchaseStatus =
  | 'pending'
  | 'succeeded'
  | 'failed'
  | 'refunded';

export type AiCreditPurchaseTrigger = 'manual' | 'auto_topup' | 'admin';

@Entity({ name: 'ai_credit_purchases' })
export class AiCreditPurchase {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'integer' })
  company_id: number;

  @Column({ type: 'decimal', precision: 13, scale: 2 })
  credits_purchased_usd: string;

  @Column({ type: 'decimal', precision: 13, scale: 4, default: 0 })
  stripe_fee_usd: string;

  @Column({ type: 'decimal', precision: 13, scale: 2 })
  amount_charged_usd: string;

  @Column({ type: 'varchar', length: 8, default: 'usd' })
  currency: string;

  @Column({
    type: 'enum',
    enum: ['pending', 'succeeded', 'failed', 'refunded'],
    default: 'pending',
  })
  status: AiCreditPurchaseStatus;

  @Column({
    type: 'enum',
    enum: ['manual', 'auto_topup', 'admin'],
    default: 'manual',
  })
  trigger_type: AiCreditPurchaseTrigger;

  @Column({ type: 'varchar', length: 120, nullable: true })
  stripe_payment_intent_id: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  stripe_charge_id: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  stripe_payment_method_id: string | null;

  @Column({ type: 'text', nullable: true })
  failure_reason: string | null;

  @Column({ type: 'text', nullable: true })
  receipt_pdf_url: string | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  receipt_emailed_at: Date | null;

  @Column({ type: 'boolean', default: false })
  is_sandbox: boolean;

  @Column({ type: 'integer', nullable: true })
  initiated_by_user_id: number | null;

  @Column({ type: 'integer', nullable: true })
  initiated_by_admin_id: number | null;

  @CreateDateColumn({
    type: 'timestamp with time zone',
    default: () => "timezone('utc', now())",
  })
  created_on: Date;

  @UpdateDateColumn({
    type: 'timestamp with time zone',
    default: () => "timezone('utc', now())",
  })
  updated_on: Date;
}
