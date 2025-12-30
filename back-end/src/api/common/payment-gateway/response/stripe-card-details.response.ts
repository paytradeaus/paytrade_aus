import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType({ description: 'Represents the details of a single payment card' })
export class CardDetailsResponse {
  @Field({ description: 'Unique identifier of the payment method' })
  payment_method_id: string;

  @Field({ description: 'Customer identifier associated with this card' })
  customer_id: string;

  @Field({ nullable: true, description: 'Name on the card, if available' })
  name_on_card: string;

  @Field({ description: 'Type of card (e.g., Visa, MasterCard)' })
  card_type: string;

  @Field({ description: 'Last four digits of the card' })
  last_four_digits: string;

  @Field({ description: 'Expiry month of the card' })
  expiry_month: number;

  @Field({ description: 'Expiry year of the card' })
  expiry_year: number;

  @Field({
    nullable: true,
    description: 'Indicates if this card is the default payment method',
  })
  is_default: boolean;
}

@ObjectType({
  description: 'Response containing all card details for a customer',
})
export class GetAllCardDetailsResponse {
  @Field({ description: 'Response status' })
  status: string;

  @Field({ description: 'Response message' })
  message: string;

  @Field(() => [CardDetailsResponse], {
    nullable: true,
    description: 'List of all card details associated with the customer',
  })
  data?: CardDetailsResponse[];
}

@ObjectType({ description: 'Response containing a single card detail' })
export class GetCardDetailsResponse {
  @Field({ description: 'Response status' })
  status: string;

  @Field({ description: 'Response message' })
  message: string;

  @Field({ nullable: true, description: 'Card detail payload' })
  data?: CardDetailsResponse;
}
