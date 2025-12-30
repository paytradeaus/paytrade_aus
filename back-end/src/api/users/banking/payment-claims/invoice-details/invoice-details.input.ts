import { Field, InputType } from '@nestjs/graphql';

@InputType({
  description:
    'Input data required to add invoice details for a payment claim.',
})
export class AddInvoiceDetailsOfAPaymentClaimInput {
  @Field({
    description: 'Description of the invoice item.',
  })
  description: string;

  @Field({
    description: 'Quantity of the invoice item.',
  })
  quantity: number;

  @Field({
    description: 'Unit price of the invoice item.',
  })
  unit_price: number;

  @Field({
    description:
      'GST amount, automatically calculated at 10% of the total amount.',
  })
  gst: number;

  @Field({
    description: 'Total amount including GST, automatically calculated.',
  })
  total_amount_including_gst: number;
}

@InputType({
  description:
    'Input data required to edit invoice details of a payment claim.',
})
export class EditInvoiceDetailsOfAPaymentClaimInput {
  @Field({
    description: 'Identifier of the payment claim.',
  })
  payment_claim_id: number;

  @Field({
    description: 'Identifier of the invoice to edit.',
  })
  invoice_id: string;

  @Field({
    nullable: true,
    description: 'Updated description of the invoice item.',
  })
  description: string;

  @Field({
    nullable: true,
    description: 'Updated quantity of the invoice item.',
  })
  quantity: number;

  @Field({
    nullable: true,
    description: 'Updated unit price of the invoice item.',
  })
  unit_price: number;

  @Field({
    nullable: true,
    description: 'Updated GST amount, if applicable.',
  })
  gst: number;

  @Field({
    nullable: true,
    description: 'User ID of the logged-in user performing the update.',
  })
  updated_by: number;
}
