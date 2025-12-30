import { Field, InputType } from '@nestjs/graphql';
import {
  CouponStatus,
  StripeCouponDurationType,
} from 'src/entities/subscription-coupon.entity';

@InputType({ description: 'Input type for adding a new gift coupon.' })
export class AddGiftCouponInput {
  @Field({ description: 'Name of the coupon.' })
  coupon_name: string;

  @Field({ description: 'Discount percentage offered by the coupon.' })
  percent_off: number;

  @Field({
    description:
      'Duration type for the coupon (e.g., once, repeating, forever).',
  })
  duration: StripeCouponDurationType;

  @Field({
    nullable: true,
    description:
      'Number of months the coupon is valid (required if duration is repeating).',
  })
  duration_in_months: number;

  @Field({ description: 'Current status of the coupon.' })
  coupon_status: CouponStatus;
}
