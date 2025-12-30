import { Field, Int, ObjectType } from '@nestjs/graphql';
import { StringResponse } from 'src/api/users/signup/response/auth.response';

@ObjectType({ description: 'Details of a coupon applied by a company.' })
class CompanyCouponDetail {
  @Field({ description: 'Unique ID of the applied coupon record.' })
  id: string;

  @Field({ description: 'ID of the company that applied the coupon.' })
  company_id: number;

  @Field({ description: 'Name of the company that applied the coupon.' })
  company_name: string;

  @Field({ description: 'ID of the coupon applied.' })
  coupon_id: number;

  @Field({ description: 'Name of the coupon applied.' })
  coupon_name: string;

  @Field({
    nullable: true,
    description: 'Duration of the coupon (e.g., month, year).',
  })
  duration: string;

  @Field({
    nullable: true,
    description: 'Percentage discount provided by the coupon.',
  })
  percent_off: number;

  @Field({ description: 'Date when the coupon was applied.' })
  applied_on: Date;

  @Field({
    nullable: true,
    description: 'Number of times the coupon has been used by the company.',
  })
  usage_count: number;

  @Field({
    nullable: true,
    description: 'Current status of the applied coupon.',
  })
  applied_coupon_status: string;
}

@ObjectType({
  description: 'List of coupons applied by companies along with total count.',
})
class CompanyAppliedCouponObj {
  @Field(() => [CompanyCouponDetail], {
    nullable: true,
    description: 'Array of applied coupon details.',
  })
  list: CompanyCouponDetail[];

  @Field(() => Int, { description: 'Total number of applied coupons.' })
  total_count: number;
}

@ObjectType({
  description: 'Response for the list of coupons applied by companies.',
})
export class CompanyAppliedCouponListResponse extends StringResponse {
  @Field({
    nullable: true,
    description: 'Data containing applied coupon list and total count.',
  })
  data: CompanyAppliedCouponObj;
}
