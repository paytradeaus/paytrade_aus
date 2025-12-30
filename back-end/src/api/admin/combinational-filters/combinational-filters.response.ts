import { ObjectType, Field } from '@nestjs/graphql';
import { BankAccountType } from 'src/libs/@paytrade-types/paytrade-types';

@ObjectType({
  description: 'Represents a simple filter option with name and value',
})
export class GetFiltersForTAadmin {
  @Field({ description: 'Name of the filter option' })
  name: string;

  @Field({ description: 'Value of the filter option' })
  value: string;
}

@ObjectType({
  description: 'Represents a bank account filter option for TA admin',
})
export class GetBankAccountFiltersForTAadmin {
  @Field({ description: 'Name of the bank account filter option' })
  name: string;

  @Field({ description: 'Value of the bank account filter option' })
  value: string;

  @Field({ nullable: true, description: 'Type of the bank account' })
  account_type: BankAccountType;

  @Field({ nullable: true, description: 'Opening date of the bank account' })
  opening_date: Date;
}

@ObjectType({
  description:
    'Lists all TA admin filters including companies, accounts, and account types',
})
export class GetFiltersForTAadminList {
  @Field(() => [GetFiltersForTAadmin], {
    nullable: true,
    description: 'List of companies',
  })
  company_list: GetFiltersForTAadmin[];

  @Field(() => [GetBankAccountFiltersForTAadmin], {
    nullable: true,
    description: 'List of bank accounts',
  })
  account_list: GetBankAccountFiltersForTAadmin[];

  @Field(() => [GetFiltersForTAadmin], {
    nullable: true,
    description: 'List of account types',
  })
  account_type_list: GetFiltersForTAadmin[];
}

@ObjectType({ description: 'Response object for TA admin filters' })
export class GetFiltersForTAadminResponse {
  @Field({ description: 'Status of the API call' })
  status: string;

  @Field({ description: 'Message describing the API response' })
  message: string;

  @Field({
    nullable: true,
    description: 'Data containing the lists of TA admin filters',
  })
  data?: GetFiltersForTAadminList;
}

@ObjectType({
  description:
    'Lists all filters for Notice admin including companies, accounts, account types, notice types, and projects',
})
export class GetFiltersForNoticeAdminList {
  @Field(() => [GetFiltersForTAadmin], {
    nullable: true,
    description: 'List of companies',
  })
  company_list: GetFiltersForTAadmin[];

  @Field(() => [GetBankAccountFiltersForTAadmin], {
    nullable: true,
    description: 'List of bank accounts',
  })
  account_list: GetBankAccountFiltersForTAadmin[];

  @Field(() => [GetFiltersForTAadmin], {
    nullable: true,
    description: 'List of account types',
  })
  account_type_list: GetFiltersForTAadmin[];

  @Field(() => [GetFiltersForTAadmin], {
    nullable: true,
    description: 'List of notice types',
  })
  notice_type_list: GetFiltersForTAadmin[];

  @Field(() => [GetFiltersForTAadmin], {
    nullable: true,
    description: 'List of projects',
  })
  project_list: GetFiltersForTAadmin[];
}

@ObjectType({ description: 'Response object for Notice admin filters' })
export class GetFiltersForNoticeAdminResponse {
  @Field({ description: 'Status of the API call' })
  status: string;

  @Field({ description: 'Message describing the API response' })
  message: string;

  @Field({
    nullable: true,
    description: 'Data containing the lists of Notice admin filters',
  })
  data?: GetFiltersForNoticeAdminList;
}

@ObjectType({
  description:
    'Lists all filters for Compliance admin including companies, projects, accounts, and account types',
})
export class GetFiltersForComplianceAdminList {
  @Field(() => [GetFiltersForTAadmin], {
    nullable: true,
    description: 'List of companies',
  })
  company_list: GetFiltersForTAadmin[];

  @Field(() => [GetFiltersForTAadmin], {
    nullable: true,
    description: 'List of projects',
  })
  project_list: GetFiltersForTAadmin[];

  @Field(() => [GetBankAccountFiltersForTAadmin], {
    nullable: true,
    description: 'List of bank accounts',
  })
  account_list: GetBankAccountFiltersForTAadmin[];

  @Field(() => [GetFiltersForTAadmin], {
    nullable: true,
    description: 'List of account types',
  })
  account_type_list: GetFiltersForTAadmin[];
}

@ObjectType({ description: 'Response object for Compliance admin filters' })
export class GetFiltersForComplianceAdminResponse {
  @Field({ description: 'Status of the API call' })
  status: string;

  @Field({ description: 'Message describing the API response' })
  message: string;

  @Field({
    nullable: true,
    description: 'Data containing the lists of Compliance admin filters',
  })
  data?: GetFiltersForComplianceAdminList;
}
