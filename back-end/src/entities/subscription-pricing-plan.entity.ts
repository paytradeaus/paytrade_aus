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
  OneToOne,
  OneToMany,
} from 'typeorm';
import { Group } from './user-details.entity';
import { SubscriptionPlanDetails } from './subscription-plan-details.entity';
import { SubscriptionDetails } from './subscription-details.entity';
import { SubscriptionTransaction } from './subscription-transactions.entity';

export type BillCycle = 'Month' | 'Year';
export type PlanStatus = 'Active' | 'Inactive' | 'Archived' | 'Deleted';

@Entity()
export class SubscriptionPricingPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'integer', unique: true })
  @Generated('increment')
  price_id: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  stripe_price_id: string;

  @Column({ type: 'integer' })
  plan_id: number;

  @Column({ type: 'varchar', length: 50 })
  price_name: string;

  @Column({
    type: 'enum',
    enum: ['Month', 'Year'],
    nullable: true,
  })
  bill_cycle: BillCycle;

  @Column({ type: 'decimal', precision: 13, scale: 2, default: 0.0 })
  plan_price: number;

  @Column({ default: false })
  is_active: boolean;

  @Column({ default: false })
  is_deleted: boolean;

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

  @ManyToOne(() => SubscriptionPlanDetails, (price) => price.pricingPlan)
  @JoinColumn({ name: 'plan_id', referencedColumnName: 'plan_id' })
  planDetails: SubscriptionPlanDetails;

  @OneToMany(() => SubscriptionDetails, (price) => price.pricingPlan)
  subscriptionDetails: SubscriptionDetails[];

  @OneToMany(() => SubscriptionTransaction, (price) => price.pricingPlan)
  subscriptionTransactions: SubscriptionTransaction[];

  @AfterInsert()
  updateSubPlanId() {
    console.log(this.price_id);
  }
}
