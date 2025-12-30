import { Field, ObjectType, Float } from '@nestjs/graphql';
import { ApiStatusType } from 'src/libs/@response-framer/response-framer';

@ObjectType({
  description:
    'Represents the details of an added invoice for a payment claim.',
})
export class AddInvoiceDetailsOfAPaymentClaim {
  @Field({
    description: 'Unique identifier of the invoice.',
  })
  invoice_id: number;

  @Field({
    description: 'Subtotal amount of the invoice before GST.',
  })
  sub_total: number;

  @Field({
    description: 'GST amount for the invoice.',
  })
  gst: number;

  @Field({
    description: 'Total amount including GST.',
  })
  total: number;
}

@ObjectType({
  description:
    'Represents the detailed information of an invoice for a payment claim.',
})
export class FetchInvoiceDetailsOfAPaymentClaimResponse {
  @Field({
    description: 'Description of the invoice item.',
  })
  description: string;

  @Field(() => Float, {
    description: 'Quantity of the invoice item.',
  })
  quantity: number;

  @Field(() => Float, {
    description: 'Unit price of the invoice item.',
  })
  unit_price: number;

  @Field(() => Float, {
    description: 'GST amount, automatically calculated at 10% of total amount.',
  })
  gst: number;

  @Field(() => Float, {
    description: 'Total amount including GST, automatically calculated.',
  })
  total_amount_including_gst: number;

  @Field({
    nullable: true,
    description: 'Identifier of the associated payment claim.',
  })
  payment_claim_id: number;
}

@ObjectType({
  description: 'Response returned after adding an invoice to a payment claim.',
})
export class AddInvoiceDetailsOfAPaymentClaimResponse {
  @Field({
    description: 'API response status (e.g., SUCCESS, ERROR).',
  })
  status: ApiStatusType;

  @Field({
    description: 'Human-readable response message.',
  })
  message: string;

  @Field({
    nullable: true,
    description: 'Details of the added invoice.',
  })
  data: AddInvoiceDetailsOfAPaymentClaim;
}

@ObjectType({
  description: 'Response returned after editing an invoice of a payment claim.',
})
export class EditInvoiceDetailsOfAPaymentClaimResponse {
  @Field({
    description: 'API response status (e.g., SUCCESS, ERROR).',
  })
  status: ApiStatusType;

  @Field({
    description: 'Human-readable response message.',
  })
  message: string;

  @Field({
    nullable: true,
    description:
      'Optional data returned after editing, e.g., invoice ID or confirmation.',
  })
  data: string;
}
