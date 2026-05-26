import { ObjectType, Field, Float } from '@nestjs/graphql';

@ObjectType({
  description: 'Represents a single payment history record for a subscription',
})
export class PaymentHistory {
  @Field({ description: 'Unique identifier of the payment record' })
  id: string;

  @Field({ description: 'Customer identifier associated with the payment' })
  customer_id: string;

  @Field({ description: 'Stripe subscription identifier' })
  stripe_subscription_id: string;

  @Field({ description: 'Internal subscription identifier' })
  subscription_id: number;

  @Field({
    nullable: true,
    description: 'Payment intent ID from Stripe, if applicable',
  })
  payment_intent: string;

  @Field({
    nullable: true,
    description: 'Invoice ID from Stripe, if applicable',
  })
  invoice_id: string;

  @Field({
    nullable: true,
    description: 'Invoice number associated with the payment',
  })
  invoice_number: string;

  @Field({ description: 'Amount paid in the transaction' })
  amount_paid: string;

  @Field({ description: 'Effective date of the payment' })
  effective_at: Date;

  @Field({
    nullable: true,
    description: 'Date when the payment was actually made',
  })
  paid_at: Date;

  @Field({ description: 'Status of the payment' })
  status: string;

  @Field({ nullable: true, description: 'Number of payment attempts made' })
  attempt_count: number;

  @Field({
    nullable: true,
    description: 'Indicates if a payment attempt was made',
  })
  attempted: boolean;

  @Field({
    nullable: true,
    description: 'Next scheduled payment attempt date, if any',
  })
  next_payment_attempt: string;

  @Field({ nullable: true, description: 'URL to hosted invoice' })
  hosted_invoice_url: string;

  @Field({ nullable: true, description: 'URL to invoice PDF' })
  invoice_pdf: string;

  @Field({
    nullable: true,
    description: 'Start date of the subscription period for this payment',
  })
  start_date: Date;

  @Field({
    nullable: true,
    description: 'Expiry date of the subscription period for this payment',
  })
  expiry_date: Date;

  @Field({ nullable: true, description: 'Payment method used' })
  payment_method: string;

  @Field({ description: 'Company identifier associated with the payment' })
  company_id: number;

  @Field({ description: 'Company name associated with the payment' })
  company_name: string;
}

@ObjectType({ description: 'Paginated list of payment history records' })
export class GetPaymentHistory {
  @Field(() => [PaymentHistory], {
    nullable: true,
    description: 'List of payment history records',
  })
  payment_history: PaymentHistory[];

  @Field({ description: 'Total number of payment history records available' })
  total_count: Number;
}

@ObjectType({ description: 'Response wrapper for fetching payment history' })
export class GetPaymentHistoryResponse {
  @Field({ description: 'Response status' })
  status: string;

  @Field({ description: 'Response message' })
  message: string;

  @Field({ nullable: true, description: 'Payment history payload' })
  data?: GetPaymentHistory;
}

@ObjectType({
  description:
    'Fresh Stripe-hosted invoice URL / PDF link retrieved on demand for a billing-history row.',
})
export class BillingReceiptUrl {
  @Field({
    nullable: true,
    description: 'Current Stripe-hosted invoice URL (re-fetched from Stripe).',
  })
  hosted_invoice_url?: string;

  @Field({
    nullable: true,
    description: 'Current Stripe invoice PDF URL (re-fetched from Stripe).',
  })
  invoice_pdf?: string;

  @Field({ nullable: true, description: 'Stripe invoice id.' })
  invoice_id?: string;

  @Field({ nullable: true, description: 'Invoice number for filename hints.' })
  invoice_number?: string;
}

@ObjectType({
  description: 'Response wrapper for refreshing a Stripe receipt URL.',
})
export class BillingReceiptUrlResponse {
  @Field({ description: 'Response status' })
  status: string;

  @Field({ description: 'Response message' })
  message: string;

  @Field({ nullable: true, description: 'Refreshed receipt URL payload' })
  data?: BillingReceiptUrl;
}
