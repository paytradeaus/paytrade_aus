import { Field, InputType, Int } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';

@InputType({ description: 'Identify a single bank account by its numeric id.' })
export class GetBankAccountPreflightInput {
  @Field(() => Int, { description: 'Bank account ID to preflight.' })
  bank_account_id: number;
}

@InputType({
  description:
    'Task #244 — start a new trust-account transfer wizard. Creates a ' +
    '`bank_account_transfers` row in Pending state + companion ' +
    '`Inter Trust Transfer` payment. Nothing else moves until the ' +
    'companion payment is confirmed / reconciled / matched in Xero.',
})
export class StartTrustAccountTransferInput {
  @Field(() => Int, { description: 'Source bank account ID (PTA or RTA).' })
  source_bank_account_id: number;

  @Field(() => Int, {
    description:
      'Destination bank account ID — must be same company + same type as source.',
  })
  destination_bank_account_id: number;

  @Field({ description: 'Date the transfer payment will be dated.' })
  transfer_date: Date;

  @Field({
    description:
      'Amount of the transfer payment. Typically the current source balance + any open items the user chose to carry across.',
  })
  amount: number;

  @Field(() => GraphQLJSON, {
    nullable: true,
    description:
      'Per-open-item carry-across choices from the wizard preflight step. Schema documented on the BankAccountTransfers entity.',
  })
  carry_across_choices?: Record<string, any>;
}

@InputType()
export class ConfirmTrustAccountTransferInput {
  @Field(() => Int) transfer_id: number;
}

@InputType()
export class CancelTrustAccountTransferInput {
  @Field(() => Int) transfer_id: number;
}

@InputType({
  description:
    'Admin-only retry of the atomic cutover for a Failed/Pending transfer. ' +
    'Pass dry_run=true to preview the planned migration counts without committing.',
})
export class RetryTrustAccountTransferCutoverInput {
  @Field(() => Int) transfer_id: number;

  @Field({
    nullable: true,
    description:
      'When true, returns the planned change counts without applying. Defaults to true for safety.',
  })
  dry_run?: boolean;
}

@InputType()
export class ListOpenTransfersInput {
  @Field(() => Int, {
    nullable: true,
    description:
      'Filter to a single source bank account (e.g. for the edit-page banner).',
  })
  bank_account_id?: number;
}
