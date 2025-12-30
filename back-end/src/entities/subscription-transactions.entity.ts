import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Group } from './user-details.entity';
import { SubscriptionDetails } from './subscription-details.entity';
import { SubscriptionPlanDetails } from './subscription-plan-details.entity';
import { SubscriptionPricingPlan } from './subscription-pricing-plan.entity';
import { CompanyDetails } from './company-details.entity';

@Entity()
export class SubscriptionTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'integer', nullable: true })
  company_id: number;

  @Column({ type: 'integer', nullable: true })
  plan_id: number;

  @Column({ type: 'integer', nullable: true })
  price_id: number;

  @Column({ type: 'text' })
  customer_id: string;

  @Column({ type: 'varchar', length: 100 })
  stripe_subscription_id: string;

  @Column({ type: 'integer' })
  subscription_id: number;

  @Column({ type: 'text', nullable: true })
  payment_intent: string;

  @Column({ type: 'text', nullable: true })
  invoice_id: string;

  @Column({ type: 'text', nullable: true })
  invoice_number: string;

  @Column({ type: 'decimal' })
  amount_paid: number;

  @Column({ type: 'timestamp with time zone' })
  effective_at: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  paid_at: Date;

  @Column({ type: 'varchar', length: 100 })
  status: string;

  @Column({ nullable: true })
  attempt_count: number;

  @Column({ nullable: true })
  attempted: boolean;

  @Column({ nullable: true })
  next_payment_attempt: string;

  @Column({ type: 'text', nullable: true })
  hosted_invoice_url: string;

  @Column({ type: 'text', nullable: true })
  invoice_pdf: string;

  @Column({ type: 'timestamp with time zone', nullable: true })
  start_date: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  expiry_date: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  trial_start: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  trial_end: Date;

  @Column({ type: 'varchar', length: 100, nullable: true })
  payment_method: string;

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

  @ManyToOne(
    () => SubscriptionDetails,
    (company) => company.subscriptionTransactions,
  )
  @JoinColumn({
    name: 'subscription_id',
    referencedColumnName: 'subscription_id',
  })
  subscriptionDetails?: SubscriptionDetails;

  @ManyToOne(
    () => SubscriptionPlanDetails,
    (subscription) => subscription.subscriptionTransactions,
  )
  @JoinColumn({ name: 'plan_id', referencedColumnName: 'plan_id' })
  planDetails?: SubscriptionPlanDetails;

  @ManyToOne(
    () => SubscriptionPricingPlan,
    (subscription) => subscription.subscriptionTransactions,
  )
  @JoinColumn({ name: 'price_id', referencedColumnName: 'price_id' })
  pricingPlan?: SubscriptionPricingPlan;

  @ManyToOne(
    () => CompanyDetails,
    (company) => company.subscriptionTransactions,
  )
  @JoinColumn({ name: 'company_id', referencedColumnName: 'company_id' })
  companyDetails?: CompanyDetails;
}
