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
import { SubscriptionPlanItems } from './subscription-plan-items.entity';
import { SubscriptionDetails } from './subscription-details.entity';
import { SubscriptionTransaction } from './subscription-transactions.entity';

export type PlanType = 'Free' | 'Paid';
export type PlanStatus = 'Active' | 'Inactive' | 'Archived' | 'Deleted';

@Entity()
export class SubscriptionPlanDetails {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'integer', unique: true })
  @Generated('increment')
  plan_id: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  stripe_product_id: string;

  @Column({ type: 'varchar', length: 50 })
  plan_name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: ['Free', 'Paid'],
    default: 'Free',
  })
  plan_type: PlanType;

  @Column({
    type: 'enum',
    enum: ['Active', 'Inactive', 'Archived', 'Deleted'],
    default: 'Active',
  })
  plan_status: PlanStatus;

  @Column({ type: 'varchar', array: true, nullable: true }) //remove null
  associated_price_ids: string[];

  @Column({ type: 'decimal', default: 0 })
  trial_period: number;

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

  @Column({ default: false })
  is_sandbox: boolean;

  @OneToMany(() => SubscriptionPricingPlan, (plan) => plan.planDetails)
  pricingPlan: SubscriptionPricingPlan[];

  @OneToMany(() => SubscriptionPlanItems, (plan) => plan.planDetails)
  planItem: SubscriptionPlanItems[];

  @OneToMany(() => SubscriptionDetails, (plan) => plan.planDetails)
  subscriptionDetails: SubscriptionDetails[];

  @OneToMany(() => SubscriptionTransaction, (plan) => plan.planDetails)
  subscriptionTransactions: SubscriptionTransaction[];

  @AfterInsert()
  updateSubPlanId() {
    console.log(this.plan_id);
  }
}
