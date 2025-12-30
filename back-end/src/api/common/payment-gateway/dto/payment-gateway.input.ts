import { InputType, Int, Field } from '@nestjs/graphql';
import { SignatureType } from 'src/entities/subscription-details.entity';

@InputType({
  description: 'Input payload to create a new pricing plan for a product',
})
export class CreatePricingInput {
  @Field({
    description: 'Identifier of the product to which the pricing applies',
  })
  product_id: string;

  @Field({
    description: 'Amount for a single unit of the product',
  })
  unit_amount: number;

  @Field({
    description: 'Nickname or label for this pricing plan',
  })
  nickname: string;
}

@InputType({
  description: 'Input payload to create or update a subscription for a company',
})
export class CreateOrUpdateSubscriptionInput {
  @Field({
    description: 'Identifier of the company subscribing',
  })
  company_id: number;

  @Field({
    description: 'Payment method identifier used for the subscription',
  })
  payment_method_id: string;

  @Field({
    description: 'Pricing plan identifier selected for the subscription',
  })
  price_id: number;

  @Field({
    nullable: true,
    description: 'Optional signature string for verification or authentication',
  })
  signature: string;

  @Field({
    nullable: true,
    description: 'Type of signature provided',
  })
  signature_type: SignatureType;

  @Field({
    nullable: true,
    description: 'Coupon identifier applied to the subscription, if any',
  })
  coupon_id: number;
}
