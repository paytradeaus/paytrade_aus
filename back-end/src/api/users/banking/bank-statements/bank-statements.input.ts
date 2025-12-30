import { InputType, Field, Float } from '@nestjs/graphql';
import { BankStatementStatus } from 'src/libs/@paytrade-types/paytrade-types';

@InputType({
  description:
    'Input payload for adding a new bank statement to a bank account.',
})
export class AddBankStatementInput {
  @Field({ description: 'Unique identifier of the business.' })
  company_id: number;

  @Field({ description: 'Unique identifier of the bank account.' })
  bank_account_id: number;

  @Field({ description: 'Name or title of the bank statement.' })
  bank_statement_name: string;

  @Field({
    description: 'Name of the financial institution issuing the statement.',
  })
  financial_institution: string;

  @Field(() => Float, {
    description: 'Closing balance amount recorded in the bank statement.',
  })
  bank_statement_balance: number;

  @Field({
    description: 'Attachment ID of the uploaded bank statement document.',
  })
  bank_statement_attachment_id: string;

  @Field({ description: 'Date of the bank statement.' })
  statement_date: Date;

  @Field({
    nullable: true,
    description: 'User ID of the logged-in user who created the record.',
  })
  created_by: number;
}

@InputType({
  description:
    'Input payload for fetching details of a specific bank statement.',
})
export class FetchBankStatementDetailsInput {
  @Field({ description: 'Unique identifier of the bank account.' })
  bank_account_id: number;

  @Field({ description: 'Unique identifier of the bank statement.' })
  bank_statement_id: number;
}

@InputType({
  description:
    'Input payload for checking whether a bank statement already exists for a given date.',
})
export class CheckExistenceOfBankStatementInput {
  @Field({ description: 'Unique identifier of the business.' })
  company_id: number;

  @Field({ description: 'Unique identifier of the bank account.' })
  bank_account_id: number;

  @Field({
    description: 'Statement date used to check for existing records.',
  })
  statement_date: Date;
}

@InputType({
  description: 'Input payload for changing the status of a bank statement.',
})
export class ChangeStatusOfBankStatementInput {
  @Field({ description: 'Unique identifier of the business.' })
  company_id: number;

  @Field({ description: 'Unique identifier of the bank statement.' })
  bank_statement_id: number;

  @Field({
    description: 'New status to be applied to the bank statement.',
  })
  status: BankStatementStatus;
}

@InputType({
  description:
    'Input payload for fetching a paginated and filtered list of bank statements.',
})
export class FetchAllBankStatementsInput {
  @Field({ description: 'Unique identifier of the business.' })
  company_id: number;

  @Field({ description: 'Unique identifier of the bank account.' })
  bank_account_id: number;

  @Field({
    nullable: true,
    description: 'Filter bank statements by status.',
  })
  status: BankStatementStatus;

  @Field({ description: 'Current page number for pagination.' })
  page: number;

  @Field({
    nullable: true,
    description: 'Search term applied to bank statement name or metadata.',
  })
  search: string;

  @Field({ description: 'Number of records per page.' })
  items_per_page: number;

  @Field({
    nullable: true,
    description:
      'Type of date filter applied (e.g., "This month", "Last month").',
  })
  date_filter: string;

  @Field({
    nullable: true,
    description: 'Start date for filtering bank statements.',
  })
  added_date_from: Date;

  @Field({
    nullable: true,
    description: 'End date for filtering bank statements.',
  })
  added_date_to: Date;

  @Field({
    nullable: true,
    description: 'Timezone used for date-based filtering.',
  })
  timezone: string;

  @Field({
    nullable: true,
    description: 'Field name used for sorting the results.',
  })
  sorting_field: string;

  @Field({
    nullable: true,
    description: 'Sorting order applied to the result set.',
  })
  sorting_order: 'ASC' | 'DESC';
}

@InputType({
  description:
    'Input payload for editing details of an existing bank statement.',
})
export class EditDetailsOfABankStatementInput {
  @Field({ description: 'Unique identifier of the bank statement.' })
  bank_statement_id: number;

  @Field({ description: 'Updated name or title of the bank statement.' })
  bank_statement_name: string;

  @Field(() => Float, {
    description: 'Updated closing balance of the bank statement.',
  })
  bank_statement_balance: number;

  @Field({
    description: 'Updated attachment ID of the bank statement document.',
  })
  bank_statement_attachment_id: string;

  @Field({ description: 'Updated statement date.' })
  statement_date: Date;

  @Field({
    nullable: true,
    description: 'User ID of the logged-in user who updated the record.',
  })
  updated_by: number;
}
