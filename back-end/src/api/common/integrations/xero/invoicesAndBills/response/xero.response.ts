import { ObjectType, Field } from '@nestjs/graphql';
import { MappedStatuses } from 'src/libs/@paytrade-types/paytrade-types';

@ObjectType({ description: 'Represents a single Xero invoice or bill record' })
export class GetXeroInvoices {
  @Field({
    nullable: true,
    description: 'Internal identifier of the Xero invoice',
  })
  id: string;

  @Field({ nullable: true, description: 'Xero invoice identifier' })
  invoice_id: string;

  @Field({ nullable: true, description: 'Tenant identifier in Xero' })
  tenant_id: string;

  @Field({ nullable: true, description: 'Document type: bill or invoice' })
  type: string;

  @Field({
    nullable: true,
    description: 'Xero contact ID associated with this invoice',
  })
  contact_id: string;

  @Field({
    nullable: true,
    description: 'Xero contact name associated with this invoice',
  })
  contact_name: string;

  @Field({ nullable: true, description: 'Status of the Xero invoice' })
  status: string;

  @Field({ nullable: true, description: 'Due date of the invoice' })
  due_date: Date;

  @Field({ nullable: true, description: 'Total amount of the invoice' })
  total_amount: number;

  @Field({ nullable: true, description: 'Mapped status to Paytrade, if any' })
  mapped_status: MappedStatuses;

  @Field({
    nullable: true,
    description: 'Paytrade claim ID this invoice is mapped to',
  })
  pt_claim_id: number;
}

@ObjectType({ description: 'Paginated list of Xero invoices or bills' })
export class GetXeroInvoicesList {
  @Field(() => [GetXeroInvoices], {
    nullable: true,
    description: 'List of Xero invoices',
  })
  invoice_list: GetXeroInvoices[];

  @Field({ description: 'Total number of Xero invoices available' })
  total_count: Number;
}

@ObjectType({ description: 'Response wrapper for a list of Xero invoices' })
export class GetXeroInvoicesListResponse {
  @Field({ description: 'Response status' })
  status: string;

  @Field({ description: 'Response message' })
  message: string;

  @Field({
    nullable: true,
    description: 'Payload containing the list of Xero invoices',
  })
  data?: GetXeroInvoicesList;
}

@ObjectType({ description: 'Response wrapper for a single Xero invoice' })
export class GetXeroInvoicesResponse {
  @Field({ description: 'Response status' })
  status: string;

  @Field({ description: 'Response message' })
  message: string;

  @Field({
    nullable: true,
    description: 'Payload containing a single Xero invoice',
  })
  data?: GetXeroInvoices;
}

@ObjectType({
  description: 'Represents a single Paytrade invoice or bill record',
})
export class GetPaytradeInvoices {
  @Field({
    nullable: true,
    description: 'Internal identifier of the Paytrade invoice',
  })
  id: string;

  @Field({ nullable: true, description: 'Paytrade invoice identifier' })
  invoice_id: number;

  @Field({ nullable: true, description: 'Document type: bill or invoice' })
  type: string;

  @Field({
    nullable: true,
    description: 'Paytrade contact ID associated with this invoice',
  })
  contact_id: string;

  @Field({
    nullable: true,
    description: 'Paytrade contact name associated with this invoice',
  })
  contact_name: string;

  @Field({ nullable: true, description: 'Status of the Paytrade invoice' })
  status: string;

  @Field({ nullable: true, description: 'Due date of the invoice' })
  due_date: Date;

  @Field({ nullable: true, description: 'Total amount of the invoice' })
  total_amount: number;

  @Field({ nullable: true, description: 'Mapped status to Xero, if any' })
  mapped_status: MappedStatuses;

  @Field({
    nullable: true,
    description: 'Xero invoice ID this Paytrade invoice is mapped to',
  })
  xero_invoice_id: string;
}

@ObjectType({ description: 'Paginated list of Paytrade invoices or bills' })
export class GetPaytradeInvoicesList {
  @Field(() => [GetPaytradeInvoices], {
    nullable: true,
    description: 'List of Paytrade invoices',
  })
  invoice_list: GetPaytradeInvoices[];

  @Field({ description: 'Total number of Paytrade invoices available' })
  total_count: Number;
}

@ObjectType({ description: 'Response wrapper for a list of Paytrade invoices' })
export class GetPaytradeInvoicesListResponse {
  @Field({ description: 'Response status' })
  status: string;

  @Field({ description: 'Response message' })
  message: string;

  @Field({
    nullable: true,
    description: 'Payload containing the list of Paytrade invoices',
  })
  data?: GetPaytradeInvoicesList;
}

@ObjectType({ description: 'Response wrapper for a single Paytrade invoice' })
export class GetPaytradeInvoicesResponse {
  @Field({ description: 'Response status' })
  status: string;

  @Field({ description: 'Response message' })
  message: string;

  @Field({
    nullable: true,
    description: 'Payload containing a single Paytrade invoice',
  })
  data?: GetPaytradeInvoices;
}
