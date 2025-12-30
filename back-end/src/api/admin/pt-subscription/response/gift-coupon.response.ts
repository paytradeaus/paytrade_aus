import { Field, Int, ObjectType } from '@nestjs/graphql';
import { StringResponse } from 'src/api/users/signup/response/auth.response';
import {
  CouponStatus,
  StripeCouponDurationType,
} from 'src/entities/subscription-coupon.entity';

@ObjectType({ description: 'Details of a gift coupon.' })
class GiftCouponDetail {
  @Field({ description: 'Unique ID of the gift coupon record.' })
  id: string;

  @Field({ description: 'ID of the coupon in the system.' })
  coupon_id: number;

  @Field({ description: 'Stripe coupon ID associated with this coupon.' })
  stripe_coupon_id: string;

  @Field({ description: 'Name of the coupon.' })
  coupon_name: string;

  @Field({
    nullable: true,
    description: 'Percentage discount provided by the coupon.',
  })
  percent_off: number;

  @Field({
    description: 'Duration type of the coupon (e.g., once, repeating).',
  })
  duration: StripeCouponDurationType;

  @Field({
    nullable: true,
    description: 'Duration of the coupon in months (if applicable).',
  })
  duration_in_months: number;

  @Field({ description: 'Status of the coupon.' })
  coupon_status: CouponStatus;

  @Field({
    nullable: true,
    description: 'ID of the user who created the coupon.',
  })
  created_by: number;

  @Field({
    nullable: true,
    description: 'Timestamp when the coupon was created.',
  })
  created_on: Date;

  @Field({
    nullable: true,
    description: 'ID of the user who last updated the coupon.',
  })
  updated_by: number;

  @Field({
    nullable: true,
    description: 'Timestamp when the coupon was last updated.',
  })
  updated_on: Date;
}

@ObjectType({
  description: 'Response when checking if a gift coupon exists by criteria.',
})
export class CheckGiftCouponExistenceResponse extends StringResponse {
  @Field(() => [GiftCouponDetail], {
    nullable: true,
    description: 'Array of matching gift coupons.',
  })
  data?: GiftCouponDetail[];
}

@ObjectType({ description: 'List of gift coupons with total count.' })
export class GiftCouponList {
  @Field(() => [GiftCouponDetail], {
    nullable: true,
    description: 'Array of gift coupon details.',
  })
  list: GiftCouponDetail[];

  @Field(() => Int, { description: 'Total number of gift coupons.' })
  total_count: number;
}

@ObjectType({ description: 'Response for fetching the list of gift coupons.' })
export class GiftCouponListResponse extends StringResponse {
  @Field({
    nullable: true,
    description: 'Data containing gift coupon list and total count.',
  })
  data?: GiftCouponList;
}

@ObjectType({ description: 'Response for fetching a gift coupon by ID.' })
export class GiftCouponByIdResponse extends StringResponse {
  @Field({ nullable: true, description: 'Gift coupon details.' })
  data?: GiftCouponDetail;
}

@ObjectType({ description: 'Response for validating a gift coupon by name.' })
export class ValidateCouponByNameResponse extends StringResponse {
  @Field({ nullable: true, description: 'Gift coupon details if found.' })
  data?: GiftCouponDetail;
}
