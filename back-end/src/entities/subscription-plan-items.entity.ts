import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  Column,
  PrimaryColumn,
  JoinColumn,
  UpdateDateColumn,
  CreateDateColumn,
} from 'typeorm';
import { SubscriptionItems } from './subscription-items.entity';
import { Group } from './user-details.entity';
import { SubscriptionPlanDetails } from './subscription-plan-details.entity';

@Entity()
export class SubscriptionPlanItems {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @PrimaryColumn({ type: 'int' })
  plan_id: number;

  @PrimaryColumn({ type: 'int' })
  item_id: number;

  @Column({ nullable: true })
  limit_value: string;

  @Column({ default: false })
  is_unlimited: Boolean;

  @ManyToOne(() => SubscriptionPlanDetails, (plan) => plan.planItem)
  @JoinColumn({ name: 'plan_id', referencedColumnName: 'plan_id' })
  planDetails: SubscriptionPlanDetails;

  @ManyToOne(() => SubscriptionItems, (item) => item.subscription_item_id)
  @JoinColumn({ name: 'item_id', referencedColumnName: 'subscription_item_id' })
  item: SubscriptionItems;

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
}
