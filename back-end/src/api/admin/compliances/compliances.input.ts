import { InputType, Field, Float } from '@nestjs/graphql';
import { BankAccountType } from 'src/libs/@paytrade-types/paytrade-types';

@InputType({
  description:
    'Input to toggle compliance checks for a Project Trust Account (PTA)',
})
export class SwitchComplianceChecksOfPTA {
  @Field({ description: 'Check contract eligibility' })
  checkContractEligibility: boolean;

  @Field({ description: 'Open the project trust account' })
  openProjectTrustAccount: boolean;

  @Field({ description: 'Notify parties of the trust account' })
  notifyPartiesOfTheTrustAccount: boolean;

  @Field({ description: 'Administration of the account' })
  administrationOfTheAccount: boolean;

  @Field({ description: 'Payments received from the principal' })
  paymentsFromThePrincipal: boolean;

  @Field({ description: 'Payments made to subcontractors' })
  paymentsToSubcontractors: boolean;

  @Field({ description: 'Payments made to yourself as trustee' })
  paymentsToYourselfAsTrustee: boolean;

  @Field({ description: 'Monthly reconciliations and recordkeeping' })
  monthlyReconciliationsAndRecordkeeping: boolean;

  @Field({ description: 'Annual account review reports' })
  annualAccountReviewReports: boolean;

  @Field({ description: 'Close the account' })
  closeTheAccount: boolean;
}

@InputType({
  description:
    'Input to toggle compliance checks for a Retention Trust Account (RTA)',
})
export class SwitchComplianceChecksOfRTA {
  @Field({ description: 'Check contract eligibility' })
  checkContractEligibility: boolean;

  @Field({ description: 'Open the retention trust account' })
  openRetentionTrustAccount: boolean;

  @Field({ description: 'Notify parties of the trust account' })
  notifyPartiesOfTheTrustAccount: boolean;

  @Field({ description: 'Administration of the account' })
  administrationOfTheAccount: boolean;

  @Field({ description: 'Withholding retention amounts from payment' })
  withholdingRetentionAmountsFromPayment: boolean;

  @Field({ description: 'Releasing retention amounts to contracted parties' })
  releasingRetentionAmountsToContractedParties: boolean;

  @Field({
    description: 'Releasing retention amounts to someone else from the account',
  })
  releasingRetentionAmountsToSomeoneElseFromTheAccount: boolean;

  @Field({ description: 'Releasing retention amounts to yourself as trustee' })
  releasingRetentionAmountsToYourselfAsTrustee: boolean;

  @Field({ description: 'Monthly reconciliations and recordkeeping' })
  monthlyReconciliationsAndRecordkeeping: boolean;

  @Field({ description: 'Annual account review reports' })
  annualAccountReviewReports: boolean;

  @Field({ description: 'Close the account' })
  closeTheAccount: boolean;
}

@InputType({
  description: 'Input to switch compliance checks for both PTA and RTA',
})
export class SwitchComplianceChecksInput {
  @Field({
    nullable: true,
    description: 'Compliance checks for Project Trust Account',
  })
  projectTrustAccount?: SwitchComplianceChecksOfPTA;

  @Field({
    nullable: true,
    description: 'Compliance checks for Retention Trust Account',
  })
  retentionTrustAccount?: SwitchComplianceChecksOfRTA;
}

@InputType({ description: 'Input to activate/deactivate a compliance rule' })
export class activateComplianceRulesInput {
  @Field({ description: 'Type of bank account' })
  bank_account_type: 'Retention Trust Account' | 'Project Trust Account';

  @Field({ description: 'Number of the check to activate/deactivate' })
  check_number: number;

  @Field({ nullable: true, description: 'Specific rule number if applicable' })
  rule_number?: number;

  @Field({ nullable: true, description: 'Whether the rule is active or not' })
  is_active?: boolean;

  @Field({
    nullable: true,
    description: 'Client identifier for which the rule applies',
  })
  clientId?: string;
}

@InputType({
  description:
    'Input to fetch activeness of compliance checks by bank account type',
})
export class FetchActivenessOfComplianceChecksInput {
  @Field({ description: 'Type of bank account' })
  bank_account_type: BankAccountType;
}

@InputType({
  description: 'Input to fetch all filters in admin compliance lists',
})
export class FetchAllFiltersInAdminCompliancesListInput {
  @Field({ nullable: true, description: 'Company identifier' })
  company_id?: number;

  @Field({ nullable: true, description: 'Project identifier' })
  project_id?: number;

  @Field({ nullable: true, description: 'Bank account identifier' })
  bank_account_id?: number;
}

@InputType({
  description: 'Input to set the contract value for contract eligibility check',
})
export class SetContractValueToCheckContractEligibilityInput {
  @Field(() => Float, { description: 'Value of the contract' })
  contract_value: number;

  @Field({ description: 'Administrator ID setting the value' })
  admin_id: number;
}

@InputType({
  description:
    'Input to fetch the contract value for contract eligibility check',
})
export class FetchContractValueToCheckContractEligibilityInput {
  @Field({ description: 'Administrator ID to fetch the contract value for' })
  admin_id: number;
}
