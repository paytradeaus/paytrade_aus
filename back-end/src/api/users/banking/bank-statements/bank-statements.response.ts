import { Field, ObjectType } from '@nestjs/graphql';
import { BankStatementStatus } from 'src/libs/@paytrade-types/paytrade-types';

@ObjectType({
  description:
    'Response data returned after successfully adding a bank statement.',
})
export class AddBankStatement {
  @Field({
    description: 'Unique identifier of the newly created bank statement.',
  })
  bank_statement_id: number;
}

@ObjectType({
  description: 'Detailed information of a specific bank statement.',
})
export class FetchBankStatementDetails {
  @Field({ description: 'Unique identifier of the bank statement.' })
  bank_statement_id: number;

  @Field({ description: 'Unique identifier of the business.' })
  company_id: number;

  @Field({ description: 'Unique identifier of the associated bank account.' })
  bank_account_id: string;

  @Field({ description: 'Name or title of the bank statement.' })
  bank_statement_name: string;

  @Field({
    description: 'Current status of the bank statement.',
  })
  status: BankStatementStatus;

  @Field({
    description: 'Closing balance recorded in the bank statement.',
  })
  bank_statement_balance: string;

  @Field({
    description: 'Attachment ID of the uploaded bank statement document.',
  })
  bank_statement_attachment_id: string;

  @Field({
    description: 'Admin or user ID who created the bank statement record.',
  })
  created_by: string;

  @Field({
    description: 'Timestamp indicating when the bank statement was created.',
  })
  created_on: Date;

  @Field({
    description: 'Date mentioned on the bank statement.',
  })
  statement_date: Date;
}

@ObjectType({
  description: 'Bank statement record used in bank statement list views.',
})
export class FetchAllBankStatements {
  @Field({ description: 'Unique identifier of the bank statement.' })
  bank_statement_id: number;

  @Field({ description: 'Unique identifier of the business.' })
  company_id: number;

  @Field({ description: 'Unique identifier of the associated bank account.' })
  bank_account_id: string;

  @Field({ description: 'Name or title of the bank statement.' })
  bank_statement_name: string;

  @Field({
    description: 'Current status of the bank statement.',
  })
  status: string;

  @Field({
    description: 'Attachment ID of the uploaded bank statement document.',
  })
  bank_statement_attachment_id: string;

  @Field({
    description: 'Date mentioned on the bank statement.',
  })
  statement_date: Date;

  @Field({
    description: 'Timestamp indicating when the bank statement was created.',
  })
  created_on: Date;

  @Field({
    description: 'Admin or user ID who created the bank statement record.',
  })
  created_by: string;
}

@ObjectType({
  description:
    'Indicates whether a bank statement already exists for a given date and account.',
})
export class CheckExistenceOfBankStatement {
  @Field({
    description:
      'Boolean flag indicating if the bank statement already exists.',
  })
  isBankStatementAlreadyExists: Boolean;
}

@ObjectType({
  description:
    'Paginated response containing bank statements along with total count.',
})
export class FetchAllBankStatementsWithTotalCount {
  @Field(() => [FetchAllBankStatements], {
    nullable: true,
    description: 'List of bank statements.',
  })
  bank_statements: FetchAllBankStatements[];

  @Field({
    description: 'Total number of bank statements matching the filters.',
  })
  total_count: number;
}

@ObjectType({
  description: 'Standard response returned after adding a bank statement.',
})
export class AddBankStatementResponse {
  @Field({ description: 'API response status.' })
  status: string;

  @Field({ description: 'Human-readable response message.' })
  message: string;

  @Field({
    nullable: true,
    description: 'Response payload containing the created bank statement ID.',
  })
  data: AddBankStatement;
}

@ObjectType({
  description: 'Response containing detailed bank statement information.',
})
export class FetchBankStatementDetailsResponse {
  @Field({ description: 'API response status.' })
  status: string;

  @Field({ description: 'Human-readable response message.' })
  message: string;

  @Field({
    nullable: true,
    description: 'Detailed bank statement data.',
  })
  data: FetchBankStatementDetails;
}

@ObjectType({
  description: 'Response containing a paginated list of bank statements.',
})
export class FetchAllBankStatementsResponse {
  @Field({ description: 'API response status.' })
  status: string;

  @Field({ description: 'Human-readable response message.' })
  message: string;

  @Field({
    nullable: true,
    description: 'Paginated list of bank statements with total count.',
  })
  data: FetchAllBankStatementsWithTotalCount;
}

@ObjectType({
  description:
    'Response returned after changing the status of a bank statement.',
})
export class ChangeStatusOfBankStatementResponse {
  @Field({ description: 'API response status.' })
  status: string;

  @Field({ description: 'Human-readable response message.' })
  message: string;

  @Field({
    nullable: true,
    description: 'Confirmation or success message.',
  })
  data: string;
}

@ObjectType({
  description: 'Response indicating whether a bank statement already exists.',
})
export class CheckExistenceOfBankStatementResponse {
  @Field({ description: 'API response status.' })
  status: string;

  @Field({ description: 'Human-readable response message.' })
  message: string;

  @Field({
    nullable: true,
    description: 'Existence check result.',
  })
  data: CheckExistenceOfBankStatement;
}

@ObjectType({
  description: 'Response returned after editing details of a bank statement.',
})
export class EditDetailsOfABankStatementResponse {
  @Field({ description: 'API response status.' })
  status: string;

  @Field({ description: 'Human-readable response message.' })
  message: string;

  @Field({
    nullable: true,
    description: 'Confirmation or success message.',
  })
  data: string;
}
