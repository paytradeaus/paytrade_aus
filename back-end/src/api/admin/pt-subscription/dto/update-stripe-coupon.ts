import { Field, InputType, PartialType } from '@nestjs/graphql';
import { AddGiftCouponInput } from './add-stripe-coupon.dto';

@InputType({ description: 'Input to update an existing Stripe coupon.' })
export class UpdateStripeCouponInput extends PartialType(AddGiftCouponInput) {
  @Field({ description: 'ID of the coupon to be updated.' })
  id: string;
}
