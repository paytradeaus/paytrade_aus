import { Field, InputType } from '@nestjs/graphql';
import { StripeCouponDurationType } from 'src/entities/subscription-coupon.entity';

@InputType({ description: 'Input to gift a subscription to a company.' })
export class GiftSubscriptionInput {
  @Field({
    description: 'ID of the company to receive the gifted subscription.',
  })
  company_id: number;

  @Field({ description: 'ID of the price/plan to be gifted.' })
  price_id: number;

  @Field({
    description:
      'Duration type of the gifted subscription (e.g., once, repeating).',
  })
  duration: StripeCouponDurationType;

  @Field({
    nullable: true,
    description:
      'Number of months the subscription is valid for, if applicable.',
  })
  months?: number;
}
