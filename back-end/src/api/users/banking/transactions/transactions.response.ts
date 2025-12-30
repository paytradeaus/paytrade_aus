import { Field, Float, ObjectType } from '@nestjs/graphql';
import { DuplicateCheck } from 'src/entities/transaction-details.entity';
import { TransactionStatus } from 'src/libs/@paytrade-types/paytrade-types';

@ObjectType({
  description: 'Represents a transaction added to a bank account.',
})
export class AddTransactionOfABankAccount {
  @Field({ description: 'Unique ID of the transaction.' })
  id: string;
}

@ObjectType({
  description: 'Detailed information about a transaction in a bank account.',
})
export class FetchDetailsOfATransactionInBankAccount {
  @Field({ description: 'ID of the business.' })
  company_id: string;

  @Field({ description: 'Bank account ID.' })
  bank_account_id: string;

  @Field({ description: 'Transaction ID.' })
  transaction_id: string;

  @Field({
    nullable: true,
    description: 'Attachment ID if transaction came from CSV upload.',
  })
  transaction_csv_file_attachment_id: string;

  @Field({ description: 'Date of the transaction.' })
  transaction_date: string;

  @Field({ description: 'Description of the transaction.' })
  description: string;

  @Field({ description: 'Amount spent in the transaction.' })
  spent_amount: string;

  @Field({ description: 'Amount received in the transaction.' })
  received_amount: string;

  @Field({ description: 'Reference or match for the transaction.' })
  matched_to: string;

  @Field({ description: 'Current status of the transaction.' })
  status: string;
}

@ObjectType({
  description: 'Represents a transaction fetched from a bank account.',
})
export class FetchAllTransactionsOfABankAccount {
  @Field({ description: 'Unique ID of the transaction.' })
  id: string;

  @Field({ description: 'Date of the transaction.' })
  transaction_date: Date;

  @Field({ nullable: true, description: 'Description of the transaction.' })
  description: string;

  @Field({ description: 'Amount spent.' })
  spent_amount: number;

  @Field({ description: 'Amount received.' })
  received_amount: string;

  @Field({ nullable: true, description: 'Matched reference, if any.' })
  matched_to: string;

  @Field({ description: 'Status of the transaction.' })
  status: TransactionStatus;
}

@ObjectType({
  description: 'Details of a CSV template file for transaction import.',
})
export class csvTemplateFileDetails {
  @Field({ nullable: true, description: 'ID of the file.' })
  id: string;

  @Field({ nullable: true, description: 'Name of the file.' })
  file_name: string;

  @Field({ nullable: true, description: 'Path where the file is stored.' })
  file_path: string;

  @Field({ nullable: true, description: 'Base64 or encoded file content.' })
  file: string;
}

@ObjectType({ description: 'Response object for CSV template file fetch.' })
export class csvTemplateFileDetailsResponse {
  @Field({ description: 'Status of the response.' })
  status: string;

  @Field({ description: 'Message describing the response.' })
  message: string;

  @Field({ nullable: true, description: 'CSV template file details.' })
  data: csvTemplateFileDetails;
}

@ObjectType({
  description: 'Represents a matched payment claim for a transaction.',
})
class PaymentClaimMatched {
  @Field({ description: 'Payment ID matched to the transaction.' })
  payment_id: number;

  @Field({ description: 'Payment claim ID matched to the transaction.' })
  payment_claim_id: number;
}

@ObjectType({
  description: 'Represents all transactions for a business or account.',
})
export class FetchAllTransactions {
  @Field({ description: 'Transaction ID.' })
  id: string;

  @Field({ nullable: true, description: 'Bank account ID.' })
  bank_account_id: number;

  @Field({ description: 'Transaction date.' })
  txn_date: Date;

  @Field({ nullable: true, description: 'Transaction description.' })
  description: string;

  @Field(() => Float, { nullable: true, description: 'Amount spent.' })
  spent_amount: number;

  @Field({ nullable: true, description: 'Formatted spent amount.' })
  formatted_spent_amount: string;

  @Field(() => Float, { nullable: true, description: 'Amount received.' })
  received_amount: number;

  @Field({ nullable: true, description: 'Formatted received amount.' })
  formatted_received_amount: string;

  @Field({ nullable: true, description: 'Matched reference if any.' })
  matched_to: string;

  @Field({
    nullable: true,
    description: 'Payment ID this transaction is matched to.',
  })
  matched_to_payment_id: string;

  @Field(() => [PaymentClaimMatched], {
    nullable: true,
    description: 'Matched payment claims.',
  })
  matched_payment_claims: PaymentClaimMatched[];

  @Field({
    nullable: true,
    description: 'Indicates if transaction is receivable.',
  })
  is_receivable: boolean;

  @Field({ description: 'Current status of the transaction.' })
  status: TransactionStatus;
}

@ObjectType({ description: 'Matched transaction details.' })
export class FetchMatchedTxn {
  @Field({ description: 'Transaction ID.' })
  id: string;

  @Field({ description: 'Transaction date.' })
  txn_date: Date;

  @Field({ nullable: true, description: 'Description of transaction.' })
  description: string;

  @Field({ nullable: true, description: 'Amount spent.' })
  spent_amount: number;

  @Field({ nullable: true, description: 'Amount received.' })
  received_amount: number;
}

@ObjectType({
  description:
    'Represents filtered transactions after CSV processing or other filters.',
})
export class FilteredTransactions {
  @Field({ description: 'Transaction ID.' })
  id: string;

  @Field({ description: 'Transaction date.' })
  txn_date: Date;

  @Field({ nullable: true, description: 'Transaction description.' })
  description: string;

  @Field({ nullable: true, description: 'Transaction amount.' })
  txn_amount: number;

  @Field({ nullable: true, description: 'Balance after transaction.' })
  balance: number;

  @Field({
    nullable: true,
    description: 'Flag indicating if transaction is similar to another.',
  })
  is_similar: boolean;

  @Field({ nullable: true, description: 'Duplicate check results.' })
  duplicate_check: DuplicateCheck;
}

@ObjectType({ description: 'Response after excluding a transaction.' })
export class ExcludeTransactionResponse {
  @Field({ description: 'Status of the exclusion operation.' })
  status: string;

  @Field({ description: 'Message describing the outcome.' })
  message: string;
}

@ObjectType({
  description:
    'Response containing details of a single transaction in a bank account.',
})
export class FetchDetailsOfATransactionInBankAccountResponse {
  @Field({ description: 'Status of the API response.' })
  status: string;

  @Field({ description: 'Message describing the response.' })
  message: string;

  @Field({ nullable: true, description: 'Detailed transaction information.' })
  data: FetchDetailsOfATransactionInBankAccount;
}

@ObjectType({
  description:
    'Response returned after adding a transaction to a bank account.',
})
export class AddTransactionOfABankAccountResponse {
  @Field({ description: 'Status of the API response.' })
  status: string;

  @Field({ description: 'Message describing the outcome of the operation.' })
  message: string;

  @Field({ nullable: true, description: 'Details of the added transaction.' })
  data: AddTransactionOfABankAccount;
}

@ObjectType({
  description: 'Response returned after adding transactions via CSV upload.',
})
export class AddTransactionsFromCsv {
  @Field({ description: 'Status of the API response.' })
  status: string;

  @Field({ description: 'Message describing the outcome.' })
  message: string;
}

@ObjectType({
  description:
    'Response after processing filtered transactions from CSV upload.',
})
export class ProcessFilterCsvUpload {
  @Field({ description: 'Status of the API response.' })
  status: string;

  @Field({ description: 'Message describing the outcome.' })
  message: string;

  @Field(() => [FilteredTransactions], {
    nullable: true,
    description: 'List of transactions after applying filters.',
  })
  data: FilteredTransactions[];
}

@ObjectType({
  description:
    'Response containing all transactions of a bank account with total count.',
})
export class FetchAllTransactionsOfABankAccountWithTotalCount {
  @Field(() => [FetchAllTransactionsOfABankAccount], {
    nullable: true,
    description: 'List of transactions for the bank account.',
  })
  transactions_list: FetchAllTransactionsOfABankAccount[];

  @Field({ description: 'Total number of transactions.' })
  total_count: number;
}

@ObjectType({
  description:
    'Response containing all transactions with total count across accounts.',
})
export class FetchAllTransactionsWithTotalCount {
  @Field(() => [FetchAllTransactions], {
    nullable: true,
    description: 'List of all transactions.',
  })
  transactions_list: FetchAllTransactions[];

  @Field({ description: 'Total number of transactions.' })
  total_count: number;
}

@ObjectType({ description: 'Response for fetching all transactions.' })
export class FetchAllTransactionsResponse {
  @Field({ description: 'Status of the API response.' })
  status: string;

  @Field({ description: 'Message describing the response.' })
  message: string;

  @Field({ nullable: true, description: 'All transactions with total count.' })
  data: FetchAllTransactionsWithTotalCount;
}

@ObjectType({
  description: 'Response for fetching all transactions of a bank account.',
})
export class FetchAllTransactionsOfABankAccountResponse {
  @Field({ description: 'Status of the API response.' })
  status: string;

  @Field({ description: 'Message describing the response.' })
  message: string;

  @Field({
    nullable: true,
    description: 'All transactions of the bank account with total count.',
  })
  data: FetchAllTransactionsOfABankAccountWithTotalCount;
}

@ObjectType({
  description: 'Represents an unmatched transaction for a business.',
})
export class FetchAllUnmatchedTransactionsOfACompany {
  @Field({ description: 'Bank account ID for the unmatched transaction.' })
  bank_account_id: number;

  @Field({ nullable: true, description: 'Name of the bank account.' })
  bank_account_name: string;

  @Field({
    description: 'Status of the transaction (e.g., "To Review", "Unmatched").',
  })
  status: 'To Review' | 'Unmatched';

  @Field({ description: 'Transaction amount.' })
  transaction_amount: number;

  @Field({ description: 'Formatted transaction amount with currency.' })
  formatted_transaction_amount: string;

  @Field({ description: 'Unique transaction ID.' })
  transaction_id: string;
}

@ObjectType({
  description:
    'Response for fetching all unmatched transactions of a business.',
})
export class fetchAllUnmatchedTransactionsOfACompanyResponse {
  @Field({ description: 'Status of the API response.' })
  status: string;

  @Field({ description: 'Message describing the response.' })
  message: string;

  @Field(() => [FetchAllUnmatchedTransactionsOfACompany], {
    nullable: true,
    description: 'List of all unmatched transactions for the business.',
  })
  data: FetchAllUnmatchedTransactionsOfACompany[];
}
