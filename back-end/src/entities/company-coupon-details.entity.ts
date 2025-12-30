import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { StripeCoupons } from './subscription-coupon.entity';
import { CompanyDetails } from './company-details.entity';

export type AppliedCouponStatus = 'Applied' | 'Expired';

@Entity()
export class CompanyCouponDetails {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'integer' })
  company_id: number;

  @ManyToOne(() => CompanyDetails, (company) => company.companyCouponDetails)
  @JoinColumn({ name: 'company_id', referencedColumnName: 'company_id' })
  companyDetails: CompanyDetails;

  @Column({ type: 'integer' })
  coupon_id: number;

  @ManyToOne(() => StripeCoupons, (coupon) => coupon.companyCouponDetails)
  @JoinColumn({ name: 'coupon_id', referencedColumnName: 'coupon_id' })
  coupon: StripeCoupons;

  @Column({ default: 1 })
  usage_count: number;

  @CreateDateColumn({
    type: 'timestamp with time zone',
    default: () => "timezone('utc', now())",
  })
  applied_on: Date;

  @Column({ default: true })
  is_active: boolean;

  @Column({
    type: 'enum',
    enum: ['Applied', 'Expired'],
    default: 'Applied',
  })
  applied_coupon_status: AppliedCouponStatus;
}
