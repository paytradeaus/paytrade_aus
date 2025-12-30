import {
  Column,
  CreateDateColumn,
  Entity,
  Generated,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Group } from './user-details.entity';
import { SubscriptionDetails } from './subscription-details.entity';
import { CompanyCouponDetails } from './company-coupon-details.entity';

export type StripeCouponDurationType = 'forever' | 'repeating' | 'once';
export type CouponStatus = 'Active' | 'Inactive' | 'Archived' | 'Deleted';

@Entity()
export class StripeCoupons {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'integer', unique: true })
  @Generated('increment')
  coupon_id: number;

  @Column({ type: 'varchar' })
  stripe_coupon_id: string;

  @Column({ type: 'varchar' })
  coupon_name: string;

  @Column({ type: 'integer' })
  percent_off: number;

  @Column({ type: 'enum', enum: ['forever', 'repeating', 'once'] })
  duration: StripeCouponDurationType;

  @Column({ type: 'integer', nullable: true, default: 0 })
  duration_in_months: number;

  @Column({
    type: 'enum',
    enum: ['Active', 'Inactive', 'Archived', 'Deleted'],
    default: 'Active',
  })
  coupon_status: CouponStatus;

  @Column()
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

  @OneToMany(() => SubscriptionDetails, (subscription) => subscription.coupon)
  subscriptionDetails?: SubscriptionDetails[];

  @OneToMany(
    () => CompanyCouponDetails,
    (companyCoupon) => companyCoupon.coupon,
  )
  companyCouponDetails?: CompanyCouponDetails[];
}
