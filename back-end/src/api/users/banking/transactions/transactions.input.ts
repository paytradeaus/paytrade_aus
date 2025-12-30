import { InputType, Field } from '@nestjs/graphql';
import { TransactionStatus } from 'src/libs/@paytrade-types/paytrade-types';

@InputType({ description: 'Input for adding a transaction to a bank account.' })
export class AddTransactionOfABankAccountInput {
  @Field({ description: 'ID of the business associated with the transaction.' })
  company_id: number;

  @Field({
    description: 'Bank account ID for which the transaction is being added.',
  })
  bank_account_id: number;

  @Field({
    nullable: true,
    description: 'Attachment ID of CSV file containing transactions.',
  })
  transaction_csv_file_attachment_id: string;

  @Field({ description: 'Date of the transaction.' })
  transaction_date: Date;

  @Field({ description: 'Description or reference of the transaction.' })
  description: string;

  @Field({ description: 'Amount spent in the transaction.' })
  spent_amount: string;

  @Field({ description: 'Amount received in the transaction.' })
  received_amount: string;

  @Field({
    description:
      'Indicates what the transaction was matched to (payment, invoice, etc).',
  })
  matched_to: string;

  @Field({
    nullable: true,
    description: 'ID of the user creating this transaction.',
  })
  created_by: number;
}

@InputType({ description: 'Input for adding generic transactions.' })
export class AddTransactionsInput {
  @Field({ description: 'Account from which the transaction originates.' })
  txn_from_account: number;

  @Field({ description: 'Account to which the transaction is credited.' })
  txn_to_account: number;

  @Field({ description: 'Date of the transaction.' })
  txn_date: Date;

  @Field({ description: 'Transaction description or reference.' })
  description: string;

  @Field({ description: 'Amount of the transaction.' })
  txn_amount: number;

  @Field({
    nullable: true,
    description: 'ID of the user creating this transaction.',
  })
  created_by: number;
}

@InputType({
  description:
    'Input to fetch details of a specific transaction in a bank account.',
})
export class FetchDetailsOfATransactionInBankAccountInput {
  @Field({ description: 'Business ID to which the bank account belongs.' })
  company_id: number;

  @Field({ description: 'Bank account ID.' })
  bank_account_id: number;

  @Field({ description: 'ID of the transaction to fetch.' })
  transaction_id: number;
}

@InputType({ description: 'Input to exclude one transaction from another.' })
export class ExcludeTransactionInput {
  @Field({ description: 'ID of the primary transaction.' })
  txn_id: string;

  @Field({ description: 'ID of the transaction to be excluded.' })
  exclude_txn_id: string;
}

@InputType({
  description:
    'Input for fetching a list of transactions for a business or bank account.',
})
export class FetchAllTransactionsInput {
  @Field({ description: 'ID of the business.' })
  company_id: number;

  @Field({
    nullable: true,
    description: 'Optional bank account ID to filter transactions.',
  })
  bank_account_id?: number;

  @Field({
    nullable: true,
    description: 'Optional status to filter transactions.',
  })
  status?: string;

  @Field({
    nullable: true,
    description: 'Search string to filter transaction description.',
  })
  search?: string;

  @Field({
    nullable: true,
    description: 'Filter only receivable transactions if true.',
  })
  is_receivable?: boolean;

  @Field({
    nullable: true,
    defaultValue: null,
    description: 'Page number for pagination.',
  })
  page: number;

  @Field({
    nullable: true,
    defaultValue: null,
    description: 'Number of items per page for pagination.',
  })
  items_per_page?: number;

  @Field({
    nullable: true,
    description: 'Date filter type (e.g., transaction_date, created_date).',
  })
  date_filter: string;

  @Field({ nullable: true, description: 'Start date for date filtering.' })
  date_from?: Date;

  @Field({ nullable: true, description: 'End date for date filtering.' })
  date_to?: Date;

  @Field({ nullable: true, description: 'Field to sort by.' })
  sorting_field?: string;

  @Field({ nullable: true, description: 'Sorting order: ASC or DESC.' })
  sorting_order?: 'ASC' | 'DESC';
}

@InputType({
  description:
    'Input for fetching all transactions for a specific bank account.',
})
export class FetchAllTransactionsOfABankAccountInput {
  @Field({ description: 'Business ID to which the bank account belongs.' })
  company_id: number;

  @Field({ description: 'Bank account ID.' })
  bank_account_id: number;

  @Field({ nullable: true, description: 'Optional transaction status filter.' })
  status?: TransactionStatus;

  @Field({ description: 'Page number for pagination.' })
  page: number;

  @Field({
    nullable: true,
    description: 'Search string for transaction description.',
  })
  search?: string;

  @Field({ nullable: true, description: 'Type of date filter to apply.' })
  date_filter: string;

  @Field({ nullable: true, description: 'Number of items per page.' })
  items_per_page?: number;

  @Field({
    nullable: true,
    description: 'Start date for created date filtering.',
  })
  created_date_from?: Date;

  @Field({
    nullable: true,
    description: 'End date for created date filtering.',
  })
  created_date_to?: Date;

  @Field({ nullable: true, description: 'User ID of the logged in user.' })
  created_by?: number;

  @Field({ nullable: true, description: 'Field to sort by.' })
  sorting_field?: string;

  @Field({ nullable: true, description: 'Sorting order: ASC or DESC.' })
  sorting_order?: 'ASC' | 'DESC';
}

@InputType({
  description: 'Input for fetching all unmatched transactions of a business.',
})
export class FetchAllUnmatchedTransactionsOfACompanyInput {
  @Field({ description: 'Business ID to fetch unmatched transactions for.' })
  company_id: number;
}
