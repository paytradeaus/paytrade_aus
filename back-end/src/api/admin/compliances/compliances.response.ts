import { ObjectType, Field } from '@nestjs/graphql';
import {
  BankAccountType,
  ComplianceChecksOfPTA,
  ComplianceChecksOfRTA,
} from 'src/libs/@paytrade-types/paytrade-types';
import { ApiStatusType } from 'src/libs/@response-framer/response-framer';

@ObjectType({ description: 'Represents the activeness of a compliance check' })
export class FetchActivenessOfComplianceChecks {
  @Field({ description: 'The name of the compliance check' })
  check_name: ComplianceChecksOfPTA | ComplianceChecksOfRTA;

  @Field({ nullable: true, description: 'The number assigned to this check' })
  check_number?: number;

  @Field({
    nullable: true,
    description: 'Whether the check is currently active',
  })
  check_active?: boolean;

  @Field(() => [ComplianceRules], {
    nullable: true,
    description: 'List of associated compliance rules',
  })
  rules?: ComplianceRules[];
}

@ObjectType({ description: 'Represents a compliance rule' })
export class ComplianceRules {
  @Field({ nullable: true, description: 'Content/description of the rule' })
  content?: string;

  @Field({ nullable: true, description: 'Number of the rule' })
  rule_number?: number;

  @Field({ nullable: true, description: 'Whether the rule is active' })
  is_active?: boolean;
}

@ObjectType({ description: 'Company details for filters' })
export class ListOfCompanies {
  @Field({ nullable: true, description: 'Name of the company' })
  company_name?: string;

  @Field({ description: 'Identifier of the company' })
  company_id: number;
}

@ObjectType({ description: 'Project details for filters' })
export class ListOfProjects {
  @Field({ nullable: true, description: 'Name of the project' })
  project_name?: string;

  @Field({ description: 'Identifier of the project' })
  project_id: number;
}

@ObjectType({ description: 'Bank account details for filters' })
export class ListOfBankAccounts {
  @Field({ nullable: true, description: 'Name of the bank account' })
  bank_account_name?: string;

  @Field({ description: 'Identifier of the bank account' })
  bank_account_id: number;
}

@ObjectType({ description: 'All available filters for admin compliance lists' })
export class FetchAllFiltersInAdminCompliancesList {
  @Field(() => [ListOfCompanies], {
    nullable: true,
    description: 'List of companies',
  })
  company_list?: ListOfCompanies[];

  @Field(() => [ListOfProjects], {
    nullable: true,
    description: 'List of projects',
  })
  project_list?: ListOfProjects[];

  @Field(() => [ListOfBankAccounts], {
    nullable: true,
    description: 'List of bank accounts',
  })
  account_list?: ListOfBankAccounts[];

  @Field(() => [String], {
    nullable: true,
    description: 'List of account types',
  })
  account_types?: string[];
}

@ObjectType({
  description: 'Response for fetching compliance check activeness',
})
export class FetchActivenessOfComplianceChecksResponse {
  @Field({ description: 'API response status' })
  status: ApiStatusType;

  @Field({ description: 'API response message' })
  message: string;

  @Field(() => [FetchActivenessOfComplianceChecks], {
    nullable: true,
    description: 'Data of compliance checks',
  })
  data?: FetchActivenessOfComplianceChecks[];
}

@ObjectType({ description: 'Response after switching compliance checks' })
export class SwitchComplianceChecksResponse {
  @Field({ description: 'API response status' })
  status: ApiStatusType;

  @Field({ description: 'API response message' })
  message: string;

  @Field({ nullable: true, description: 'Optional response data' })
  data?: string;
}

@ObjectType({
  description: 'Response after activating or inactivating compliance rules',
})
export class activateInactivateComplianceRulesResponse {
  @Field({ description: 'API response status' })
  status: ApiStatusType;

  @Field({ description: 'API response message' })
  message: string;
}

@ObjectType({
  description: 'Response for fetching all filters in admin compliance list',
})
export class FetchAllFiltersInAdminCompliancesListResponse {
  @Field({ description: 'API response status' })
  status: ApiStatusType;

  @Field({ description: 'API response message' })
  message: string;

  @Field({ nullable: true, description: 'All filters available for admin' })
  data?: FetchAllFiltersInAdminCompliancesList;
}

@ObjectType({
  description: 'Response for setting contract value for eligibility check',
})
export class SetContractValueToCheckContractEligibilityResponse {
  @Field({ description: 'API response status' })
  status: ApiStatusType;

  @Field({ description: 'API response message' })
  message: string;

  @Field({ nullable: true, description: 'Optional response data' })
  data?: string;
}

@ObjectType({ description: 'Details of contract value' })
export class ContractValueDetails {
  @Field({ nullable: true, description: 'Contract value' })
  contract_value?: number;
}

@ObjectType({
  description: 'Response for fetching contract value for eligibility check',
})
export class FetchContractValueToCheckContractEligibilityResponse {
  @Field({ description: 'API response status' })
  status: ApiStatusType;

  @Field({ description: 'API response message' })
  message: string;

  @Field({ nullable: true, description: 'Contract value details' })
  data?: ContractValueDetails;
}
