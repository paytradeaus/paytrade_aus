import { ObjectType, Field } from '@nestjs/graphql';
import {
  ClientSupplierStatus,
  ClientSupplierType,
} from 'src/entities/client-suppliers-details.entity';

@ObjectType({
  description: 'Details of a client/supplier relevant for a payment claim.',
})
export class FetchClientSupplierDetailsForPaymentClaim {
  @Field({ nullable: true, description: 'Unique identifier of the client or supplier.' })
  client_supplier_id: number;

  @Field({ nullable: true, description: 'Name of the client or supplier.' })
  client_supplier_name: string;

  @Field({ nullable: true, description: 'Address of the client or supplier.' })
  client_supplier_address: string;

  @Field({ nullable: true, description: 'Type of client or supplier.' })
  client_supplier_type: ClientSupplierType;

  @Field({ nullable: true, description: 'Payment terms applicable to the client/supplier.' })
  payment_terms: number;

  @Field({
    nullable: true,
    description: 'Account ID from which payments are made (optional).',
  })
  payment_from_account: number;

  @Field({
    nullable: true,
    description: 'Type of the payment-from account (optional).',
  })
  payment_from_account_type: string;

  @Field({
    nullable: true,
    description: 'Name of the payment-from account (optional).',
  })
  payment_from_account_name: string;

  @Field({
    nullable: true,
    description: 'BSB number of the payment-from account (optional).',
  })
  payment_from_account_bsb_number: string;

  @Field({
    nullable: true,
    description: 'Account number of the payment-from account (optional).',
  })
  payment_from_account_number: string;

  @Field({ nullable: true, description: 'Account ID to which payments are made.' })
  payment_to_account: number;

  @Field({ nullable: true, description: 'Type of the payment-to account.' })
  payment_to_account_type: string;

  @Field({ nullable: true, description: 'Name of the payment-to account.' })
  payment_to_account_name: string;

  @Field({ nullable: true, description: 'BSB number of the payment-to account.' })
  payment_to_account_bsb_number: string;

  @Field({ nullable: true, description: 'Account number of the payment-to account.' })
  payment_to_account_number: string;

  @Field({ nullable: true, description: 'Initial contract sum (optional).' })
  initial_contract_sum: number;

  @Field({
    nullable: true,
    description: 'Variation amount in the contract (optional).',
  })
  variation_amount: number;

  @Field({
    nullable: true,
    description: 'Claim amount for the payment claim (optional).',
  })
  claim_amount: number;
}

// Task #154 — Per-entry result returned to the frontend after the email
// transition runs the queued smart-create replays.
@ObjectType({
  description:
    'Result of replaying a single queued smart-create-contract attempt after the contact email was added.',
})
export class PendingSmartCreateResult {
  @Field({ description: 'Xero invoice/bill id the smart create was for.' })
  invoice_id: string;

  @Field({
    description:
      'Outcome of the replay: created | skipped | failed. See reason for skipped/failed.',
  })
  status: string;

  @Field({ nullable: true, description: 'Why the replay was skipped or failed.' })
  reason?: string;

  @Field({
    nullable: true,
    description: 'PayTrade contract id when status=created.',
  })
  contract_id?: number;
}

// Task #154 — Aggregate "items that were waiting" returned alongside the
// edited contact so the frontend can show the
// "N items were waiting — Process now / Review first / Not now" prompt.
@ObjectType({
  description:
    'Items that were waiting for this contact to get an email, returned after the email is saved.',
})
export class ContactPendingResolutions {
  @Field({
    description:
      'True when the user just added an email that the contact previously lacked (transition).',
  })
  email_just_added: boolean;

  @Field({
    description:
      'Number of queued smart-contract auto-create attempts that were replayed.',
  })
  smart_creates_attempted: number;

  @Field(() => [PendingSmartCreateResult], {
    description: 'Per-attempt result for the replayed smart-create attempts.',
  })
  smart_creates: PendingSmartCreateResult[];

  @Field({
    description:
      'Number of failed/blocked notices for this contact still awaiting user action.',
  })
  blocked_notices_count: number;
}

@ObjectType({ description: 'Basic client/supplier details response.' })
export class ClientSuppliersDetailsRes {
  @Field({ description: 'Unique identifier of the record.' })
  id: string;

  @Field({
    description:
      'Identifier of the business associated with the client/supplier.',
  })
  company_id: number;

  @Field({
    nullable: true,
    description: 'Optional identifier of the client/supplier.',
  })
  client_supplier_id?: number;

  @Field({ description: 'Name of the client/supplier.' })
  client_supplier_name: string;

  @Field({ description: 'Status of the client/supplier.' })
  client_supplier_status: ClientSupplierStatus;

  // Task #154 — populated only by editClientSuppliersDetailsById when the
  // user adds an email that was previously missing.
  @Field(() => ContactPendingResolutions, {
    nullable: true,
    description:
      'Items that were waiting for this contact to get an email — populated after the email is saved on a previously-flagged contact.',
  })
  pending_resolutions?: ContactPendingResolutions;
}

@ObjectType({ description: 'Response wrapper for client/supplier details.' })
export class ClientSuppliersDetailsResponse {
  @Field({ description: 'Status of the API response.' })
  status: string;

  @Field({
    description: 'Message providing additional context about the response.',
  })
  message: string;

  @Field({
    nullable: true,
    description: 'Optional client/supplier details data.',
  })
  data?: ClientSuppliersDetailsRes;
}

@ObjectType({
  description:
    'Response wrapper for fetching client/supplier details specifically for payment claims.',
})
export class FetchClientSupplierDetailsForPaymentClaimResponse {
  @Field({ description: 'Status of the API response.' })
  status: string;

  @Field({
    description: 'Message providing additional context about the response.',
  })
  message: string;

  @Field({
    nullable: true,
    description: 'Client/supplier details for a payment claim.',
  })
  data?: FetchClientSupplierDetailsForPaymentClaim;
}
