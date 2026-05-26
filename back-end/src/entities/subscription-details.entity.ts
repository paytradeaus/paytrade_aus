import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Generated,
  AfterInsert,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { Group } from './user-details.entity';
import { SubscriptionPricingPlan } from './subscription-pricing-plan.entity';
import { CompanyDetails } from './company-details.entity';
import { SubscriptionPlanDetails } from './subscription-plan-details.entity';
import { SubscriptionTransaction } from './subscription-transactions.entity';
import { StripeCoupons } from './subscription-coupon.entity';
export type SubsciptionPlanStatus =
  | 'Subscribed'
  | 'Cancelled'
  | 'Under Trial'
  | 'Unsubscribed'
  | 'Archived'
  | 'Deleted'
  | 'Past Due';
export type SignatureType = 'IMAGE' | 'CANVAS';

@Entity()
export class SubscriptionDetails {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'integer', unique: true })
  @Generated('increment')
  subscription_id: number;

  @Column({ type: 'integer' })
  company_id: number;

  @Column({ type: 'integer', nullable: true })
  plan_id: number;

  @Column({ type: 'integer', nullable: true })
  price_id: number;

  @Column({ type: 'integer', nullable: true })
  coupon_id: number;

  @Column({ type: 'decimal', precision: 13, scale: 2, default: 0.0 })
  amount: number;

  @Column({ type: 'timestamp with time zone', nullable: true })
  start_date: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  expiry_date: Date;

  @Column({
    type: 'enum',
    enum: [
      'Subscribed',
      'Cancelled',
      'Under Trial',
      'Unsubscribed',
      'Past Due',
      'Archived',
      'Deleted',
    ],
    default: 'Unsubscribed',
  })
  status: SubsciptionPlanStatus;

  @Column({ type: 'varchar', length: 50, nullable: true })
  stripe_customer_id: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  payment_method_id: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  stripe_subscription_id: string;

  @Column({ type: 'timestamp with time zone', nullable: true })
  trial_start: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  trial_end: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  canceled_at: Date;

  @Column({ type: 'text', nullable: true })
  cancellation_reason: string;

  @Column({ type: 'boolean', default: false, nullable: true })
  is_free_plan_eligible: boolean;

  @Column({ type: 'text', nullable: true })
  free_plan_reason: string;

  /**
   * Task #312 — when true, this subscription's headline `amount` is
   * GST-INCLUSIVE (Stripe charges the headline; the invoice line splits
   * it into ex-GST + GST). When false/null, GST is added on TOP of the
   * headline (current default for all new subscriptions). Set only for
   * legacy subscriptions whose contracted price already included GST
   * (e.g. Signature's $300 = $272.73 + $27.27 GST).
   */
  @Column({ type: 'boolean', nullable: true, default: false })
  is_gst_inclusive: boolean;

  @Column({ type: 'text', nullable: true })
  signature: string;

  @Column({
    type: 'enum',
    enum: ['IMAGE', 'CANVAS'],
    nullable: true,
  })
  signature_type: SignatureType;

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

  @OneToOne(
    () => CompanyDetails,
    (subscription) => subscription.subscriptionDetails,
  )
  @JoinColumn({ name: 'company_id', referencedColumnName: 'company_id' })
  companyDetails: CompanyDetails;

  @ManyToOne(
    () => SubscriptionPlanDetails,
    (subscription) => subscription.subscriptionDetails,
  )
  @JoinColumn({ name: 'plan_id', referencedColumnName: 'plan_id' })
  planDetails: SubscriptionPlanDetails;

  @ManyToOne(
    () => SubscriptionPricingPlan,
    (subscription) => subscription.subscriptionDetails,
  )
  @JoinColumn({ name: 'price_id', referencedColumnName: 'price_id' })
  pricingPlan: SubscriptionPricingPlan;

  @ManyToOne(() => StripeCoupons, (coupon) => coupon.subscriptionDetails)
  @JoinColumn({ name: 'coupon_id', referencedColumnName: 'coupon_id' })
  coupon: StripeCoupons;

  @OneToMany(
    () => SubscriptionTransaction,
    (subscription) => subscription.subscriptionDetails,
  )
  subscriptionTransactions?: SubscriptionTransaction[];

  @AfterInsert()
  updateSubPlanId() {
    console.log(this.subscription_id);
  }
}
