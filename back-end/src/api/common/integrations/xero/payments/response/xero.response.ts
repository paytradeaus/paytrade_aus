import { ObjectType, Field } from '@nestjs/graphql';
import { MappedStatuses } from 'src/libs/@paytrade-types/paytrade-types';

@ObjectType({ description: 'Represents a single Xero payment record' })
export class GetXeroPayments {
  @Field({ nullable: true, description: 'Unique internal ID' })
  id: string;

  @Field({ nullable: true, description: 'Xero payment ID' })
  payment_id: string;

  @Field({
    nullable: true,
    description: 'Invoice ID associated with this payment',
  })
  invoice_id: string;

  @Field({
    nullable: true,
    description: 'Bank account ID used for this payment',
  })
  account_id: string;

  @Field({ nullable: true, description: 'Tenant ID in Xero' })
  tenant_id: string;

  @Field({
    nullable: true,
    description: 'Type of payment (e.g., credit, debit)',
  })
  payment_type: string;

  @Field({
    nullable: true,
    description: 'Contact ID associated with the payment',
  })
  contact_id: string;

  @Field({
    nullable: true,
    description: 'Contact name associated with the payment',
  })
  contact_name: string;

  @Field({ nullable: true, description: 'Status of the payment' })
  status: string;

  @Field({ nullable: true, description: 'Date when the payment was made' })
  payment_date: Date;

  @Field({ nullable: true, description: 'Amount of the payment' })
  payment_amount: number;

  @Field({ nullable: true, description: 'Mapping status with Paytrade' })
  mapped_status: MappedStatuses;

  @Field({
    nullable: true,
    description: 'Corresponding Paytrade payment ID if mapped',
  })
  pt_payment_id: number;
}

@ObjectType({ description: 'Represents a paginated list of Xero payments' })
export class GetXeroPaymentsList {
  @Field(() => [GetXeroPayments], {
    nullable: true,
    description: 'List of Xero payments',
  })
  payment_list: GetXeroPayments[];

  @Field({ description: 'Total number of Xero payments available' })
  total_count: Number;
}

@ObjectType({ description: 'Response wrapper for a list of Xero payments' })
export class GetXeroPaymentsListResponse {
  @Field({ description: 'Status of the response' })
  status: string;

  @Field({ description: 'Response message' })
  message: string;

  @Field({ nullable: true, description: 'Data containing Xero payments list' })
  data?: GetXeroPaymentsList;
}

@ObjectType({ description: 'Response wrapper for a single Xero payment' })
export class GetXeroPaymentsResponse {
  @Field({ description: 'Status of the response' })
  status: string;

  @Field({ description: 'Response message' })
  message: string;

  @Field({
    nullable: true,
    description: 'Data containing a single Xero payment',
  })
  data?: GetXeroPayments;
}

@ObjectType({ description: 'Represents a single Paytrade payment record' })
export class GetPaytradePayments {
  @Field({ nullable: true, description: 'Unique internal ID' })
  id: string;

  @Field({ nullable: true, description: 'Paytrade payment ID' })
  payment_id: number;

  @Field({
    nullable: true,
    description: 'Invoice ID associated with this payment',
  })
  invoice_id: number;

  @Field({
    nullable: true,
    description: 'Bank account ID used for this payment',
  })
  account_id: string;

  @Field({
    nullable: true,
    description: 'Type of payment (e.g., credit, debit)',
  })
  payment_type: string;

  @Field({
    nullable: true,
    description: 'Contact ID associated with the payment',
  })
  contact_id: number;

  @Field({
    nullable: true,
    description: 'Contact name associated with the payment',
  })
  contact_name: string;

  @Field({ nullable: true, description: 'Status of the payment' })
  status: string;

  @Field({ nullable: true, description: 'Date when the payment was made' })
  payment_date: Date;

  @Field({ nullable: true, description: 'Amount of the payment' })
  payment_amount: number;

  @Field({ nullable: true, description: 'Mapping status with Xero' })
  mapped_status: MappedStatuses;

  @Field({
    nullable: true,
    description: 'Corresponding Xero payment ID if mapped',
  })
  xero_payment_id: string;
}

@ObjectType({ description: 'Represents a paginated list of Paytrade payments' })
export class GetPaytradePaymentsList {
  @Field(() => [GetPaytradePayments], {
    nullable: true,
    description: 'List of Paytrade payments',
  })
  payment_list: GetPaytradePayments[];

  @Field({ description: 'Total number of Paytrade payments available' })
  total_count: Number;
}

@ObjectType({ description: 'Response wrapper for a list of Paytrade payments' })
export class GetPaytradePaymentsListResponse {
  @Field({ description: 'Status of the response' })
  status: string;

  @Field({ description: 'Response message' })
  message: string;

  @Field({
    nullable: true,
    description: 'Data containing Paytrade payments list',
  })
  data?: GetPaytradePaymentsList;
}

@ObjectType({ description: 'Response wrapper for a single Paytrade payment' })
export class GetPaytradePaymentsResponse {
  @Field({ description: 'Status of the response' })
  status: string;

  @Field({ description: 'Response message' })
  message: string;

  @Field({
    nullable: true,
    description: 'Data containing a single Paytrade payment',
  })
  data?: GetPaytradePayments;
}
