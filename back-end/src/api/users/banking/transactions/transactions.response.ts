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

@ObjectType({ description: 'Suggested sub-payment match for a transaction.' })
export class SuggestedMatchPayment {
  @Field({ description: 'UUID of the sub_payment row.' })
  id: string;

  @Field({ description: 'Sub-payment ID.' })
  sub_payment_id: number;

  @Field({ description: 'Parent payment ID.' })
  payment_id: number;

  @Field({ nullable: true, description: 'Sub-payment type.' })
  sub_payment_type: string;

  @Field(() => Float, { description: 'Sub-payment amount.' })
  amount: number;

  @Field({ nullable: true, description: 'Payment type.' })
  payment_type: string;

  @Field({ nullable: true, description: 'Payment date.' })
  payment_date: Date;

  @Field({ nullable: true, description: 'Claim type.' })
  claim_type: string;

  @Field({ nullable: true, description: 'Client/supplier name.' })
  client_supplier_name: string;

  @Field({ nullable: true, description: 'Payment from account name.' })
  payment_from_account_name: string;

  @Field({ nullable: true, description: 'Payment to account name.' })
  payment_to_account_name: string;

  @Field({ nullable: true, description: 'Project name.' })
  project_name: string;

  @Field({ nullable: true, description: 'Contract name.' })
  contract_name: string;

  @Field(() => Float, { nullable: true, description: 'Claim amount.' })
  claim_amount: number;

  @Field({ nullable: true, description: 'Payment claim ID.' })
  payment_claim_id: number;

  @Field({ nullable: true, description: 'Payment from account ID.' })
  payment_from_account: number;

  @Field({ nullable: true, description: 'Payment to account ID.' })
  payment_to_account: number;

  @Field({ nullable: true, description: 'Retention account.' })
  retention_account: number;
}

@ObjectType({ description: 'A transaction with its suggested match.' })
export class SuggestedMatchItem {
  @Field({ description: 'Transaction UUID.' })
  transaction_id: string;

  @Field(() => Float, { description: 'Transaction amount (signed).' })
  txn_amount: number;

  @Field({ description: 'Match quality: exact, near, bulk, or none.' })
  match_quality: string;

  @Field(() => Float, { description: 'Difference amount (txn - payment(s)). 0 for exact.' })
  difference_amount: number;

  @Field({ nullable: true, description: 'True when the candidate pool exceeded the auto-search cap and a wider goal-seek review is recommended.' })
  review_needed: boolean;

  @Field(() => SuggestedMatchPayment, { nullable: true, description: 'Best matching payment (exact/near/none).' })
  suggested_payment: SuggestedMatchPayment;

  @Field(() => [SuggestedMatchPayment], { nullable: true, description: 'Bulk match legs (one bank line ↔ many sub-payments).' })
  suggested_payments: SuggestedMatchPayment[];
}

@ObjectType({ description: 'A single bank-line leg inside a SPLIT suggestion.' })
export class SplitTransactionLeg {
  @Field({ description: 'Transaction UUID.' })
  id: string;

  @Field({ description: 'Transaction date (ISO).' })
  txn_date: Date;

  @Field(() => Float, { description: 'Transaction amount (signed).' })
  txn_amount: number;

  @Field({ nullable: true, description: 'Transaction description.' })
  description: string;

  @Field(() => Float, { nullable: true, description: 'Bank account ID.' })
  bank_account_id: number;
}

@ObjectType({ description: 'A split suggestion: one sub-payment matched by several bank lines.' })
export class SplitMatchItem {
  @Field(() => SuggestedMatchPayment, { description: 'The sub-payment being split-matched.' })
  sub_payment: SuggestedMatchPayment;

  @Field(() => [SplitTransactionLeg], { description: 'Bank-line legs that together equal the sub-payment.' })
  transactions: SplitTransactionLeg[];

  @Field(() => Float, { description: 'Difference amount (sub_payment - Σ legs). 0 for exact.' })
  difference_amount: number;

  @Field({ nullable: true, description: 'True when the bank-line candidate pool exceeded the auto-search cap.' })
  review_needed: boolean;
}

@ObjectType({ description: 'Data for batch suggested matches.' })
export class BatchSuggestedMatchesData {
  @Field(() => [SuggestedMatchItem], { description: 'List of suggested matches (1-to-1 and bulk).' })
  matches: SuggestedMatchItem[];

  @Field(() => [SplitMatchItem], { nullable: true, description: 'Split matches: one sub-payment ↔ many bank lines.' })
  split_matches: SplitMatchItem[];

  @Field({ description: 'Total unmatched transactions.' })
  total_unmatched: number;

  @Field({ description: 'Count of exact matches found.' })
  exact_match_count: number;

  @Field({ description: 'Count of near matches found.' })
  near_match_count: number;

  @Field({ nullable: true, description: 'Count of bulk matches found.' })
  bulk_match_count: number;

  @Field({ nullable: true, description: 'Count of split matches found.' })
  split_match_count: number;
}

@ObjectType({ description: 'Response for batch suggested matches.' })
export class BatchSuggestedMatchesResponse {
  @Field({ description: 'Status of the API response.' })
  status: string;

  @Field({ description: 'Message describing the response.' })
  message: string;

  @Field(() => BatchSuggestedMatchesData, { nullable: true, description: 'Suggested match data.' })
  data: BatchSuggestedMatchesData;
}

@ObjectType({ description: 'Result of a single match in batch operation.' })
export class BatchMatchResult {
  @Field({ description: 'Transaction ID.' })
  transaction_id: string;

  @Field({ description: 'Whether match succeeded.' })
  success: boolean;

  @Field({ nullable: true, description: 'Error message if failed.' })
  error: string;
}

@ObjectType({ description: 'Data for batch match response.' })
export class BatchMatchData {
  @Field(() => [BatchMatchResult], { description: 'Results per match pair.' })
  results: BatchMatchResult[];

  @Field({ description: 'Total succeeded.' })
  succeeded: number;

  @Field({ description: 'Total failed.' })
  failed: number;

  @Field(() => [Float], { nullable: true, description: 'Payment IDs for notice triggering.' })
  payment_ids: number[];
}

@ObjectType({ description: 'Response for batch match operation.' })
export class BatchMatchResponse {
  @Field({ description: 'Status of the API response.' })
  status: string;

  @Field({ description: 'Message describing the response.' })
  message: string;

  @Field(() => BatchMatchData, { nullable: true, description: 'Batch match results.' })
  data: BatchMatchData;
}

@ObjectType({ description: 'Data for quick adjust and match response.' })
export class QuickAdjustMatchData {
  @Field({ description: 'Adjustment payment ID created.' })
  adjustment_payment_id: number;

  @Field({ description: 'Adjustment payment type.' })
  adjustment_type: string;

  @Field(() => Float, { description: 'Adjustment amount.' })
  adjustment_amount: number;

  @Field(() => [Float], { nullable: true, description: 'Payment IDs for notice triggering.' })
  payment_ids: number[];
}

@ObjectType({ description: 'Response for quick adjust and match.' })
export class QuickAdjustMatchResponse {
  @Field({ description: 'Status of the API response.' })
  status: string;

  @Field({ description: 'Message describing the response.' })
  message: string;

  @Field(() => QuickAdjustMatchData, { nullable: true, description: 'Adjust-match result.' })
  data: QuickAdjustMatchData;
}

@ObjectType({ description: 'Response for smart match preference operations.' })
export class SmartMatchPreferenceResponse {
  @Field({ description: 'Status of the API response.' })
  status: string;

  @Field({ description: 'Message describing the response.' })
  message: string;
}
