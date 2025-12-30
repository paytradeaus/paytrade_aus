import { Field, ObjectType } from '@nestjs/graphql';
import { UserStatus } from 'src/entities/user-details.entity';
import {
  BankAccountType,
  ReconcileStatus,
} from 'src/libs/@paytrade-types/paytrade-types';
import { ApiStatusType } from 'src/libs/@response-framer/response-framer';

@ObjectType({ description: 'Represents a newly created user' })
export class FetchAllNewUsers {
  @Field({ description: 'Unique identifier of the user' })
  user_id: number;

  @Field({ nullable: true, description: 'First name of the user' })
  first_name?: string;

  @Field({ nullable: true, description: 'Last name of the user' })
  last_name?: string;

  @Field({ description: 'Timestamp when the user was created' })
  created_date: Date;

  @Field({ description: 'Status of the user' })
  status: UserStatus;
}

@ObjectType({ description: 'Represents a newly created company' })
export class FetchAllNewCompanies {
  @Field({ description: 'Timestamp when the company was created' })
  created_date: Date;

  @Field({ description: 'Unique identifier of the company' })
  company_id: number;

  @Field({ nullable: true, description: 'Name of the company' })
  company_name?: string;

  @Field({ nullable: true, description: 'Status of the company' })
  status?: string;
}

@ObjectType({
  description: 'Represents companies with failed subscription status',
})
export class FetchAllCompaniesWithFailedSubscriptionStatus {
  @Field({ nullable: true, description: 'Company ID' })
  company_id?: number;

  @Field({
    nullable: true,
    description: 'Transaction status of the subscription',
  })
  transaction_status?: string;

  @Field({ nullable: true, description: 'Company name' })
  company_name?: string;

  @Field({ nullable: true, description: 'Primary admin user ID' })
  primary_admin_id?: number;

  @Field({ nullable: true, description: 'Primary admin name' })
  primary_admin_name?: string;

  @Field({ nullable: true, description: 'Primary admin email' })
  primary_admin_email?: string;
}

@ObjectType({ description: 'Represents projects with compliance issues' })
export class FetchhAllProjectsWithComplianceIssues {
  @Field({ description: 'Project ID' })
  project_id: number;

  @Field({ nullable: true, description: 'Project name' })
  project_name?: string;

  @Field({ nullable: true, description: 'Project status' })
  project_status?: string;

  @Field({
    nullable: true,
    description: 'Bank account ID associated with the project',
  })
  bank_account_id?: number;

  @Field({ nullable: true, description: 'Type of bank account' })
  bank_account_type?: BankAccountType;

  @Field({ nullable: true, description: 'Bank account name' })
  bank_account_name?: string;

  @Field({ description: 'PTA compliance status' })
  pta_compliance: string;

  @Field({ description: 'RTA compliance status' })
  rta_compliance: string;

  @Field({ description: 'Number of compliance issues found' })
  issues: number;
}

@ObjectType({
  description: 'Represents bank accounts with trust accounting issues',
})
export class FetchAllBankAccountsWithTrustAccountingIssues {
  @Field({ nullable: true, description: 'Company ID' })
  company_id?: number;

  @Field({ nullable: true, description: 'Company name' })
  company_name?: string;

  @Field({ nullable: true, description: 'Bank account ID' })
  bank_account_id?: number;

  @Field({ nullable: true, description: 'Bank account name' })
  bank_account_name?: string;

  @Field({ nullable: true, description: 'Bank account status' })
  status?: string;
}

// Response ObjectTypes

@ObjectType({ description: 'Response containing newly created users' })
export class FetchAllNewUsersResponse {
  @Field({ description: 'API response status' })
  status: ApiStatusType;

  @Field({ description: 'API response message' })
  message: string;

  @Field(() => [FetchAllNewUsers], {
    nullable: true,
    description: 'List of new users',
  })
  data?: FetchAllNewUsers[];
}

@ObjectType({ description: 'Response containing newly created companies' })
export class FetchAllNewCompaniesResponse {
  @Field({ description: 'API response status' })
  status: 'SUCCESS' | 'FAILED';

  @Field({ description: 'API response message' })
  message: string;

  @Field(() => [FetchAllNewCompanies], {
    nullable: true,
    description: 'List of new companies',
  })
  data?: FetchAllNewCompanies[];
}

@ObjectType({
  description: 'Response containing companies with failed subscription status',
})
export class FetchAllCompaniesWithFailedSubscriptionStatusResponse {
  @Field({ description: 'API response status' })
  status: 'SUCCESS' | 'FAILED';

  @Field({ description: 'API response message' })
  message: string;

  @Field(() => [FetchAllCompaniesWithFailedSubscriptionStatus], {
    nullable: true,
    description: 'List of companies with failed subscription',
  })
  data?: FetchAllCompaniesWithFailedSubscriptionStatus[];
}

@ObjectType({
  description: 'Response containing projects with compliance issues',
})
export class FetchhAllProjectsWithComplianceIssuesResponse {
  @Field({ description: 'API response status' })
  status: 'SUCCESS' | 'FAILED';

  @Field({ description: 'API response message' })
  message: string;

  @Field(() => [FetchhAllProjectsWithComplianceIssues], {
    nullable: true,
    description: 'List of projects with compliance issues',
  })
  data?: FetchhAllProjectsWithComplianceIssues[];
}

@ObjectType({
  description: 'Response containing bank accounts with trust accounting issues',
})
export class FetchAllBankAccountsWithTrustAccountingIssuesResponse {
  @Field({ description: 'API response status' })
  status: ApiStatusType;

  @Field({ description: 'API response message' })
  message: string;

  @Field(() => [FetchAllBankAccountsWithTrustAccountingIssues], {
    nullable: true,
    description: 'List of bank accounts with trust accounting issues',
  })
  data?: FetchAllBankAccountsWithTrustAccountingIssues[];
}
