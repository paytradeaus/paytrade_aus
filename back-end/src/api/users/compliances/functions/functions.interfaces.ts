import { RetentionType } from 'src/entities/contract-details.entity';
import { ProjectRole } from 'src/entities/project-details.entity';
import {
  ActionButtonType,
  BankAccountType,
  DelegatePowers,
} from 'src/libs/@paytrade-types/paytrade-types';

export interface IFetchRuleDetails {
  check_number: number;
  rule_number: number;
}

export interface IProjectDetails {
  id: string;
  project_id: number;
  project_role: ProjectRole;
  pta_eligibility: string;
  rta_eligibility: string;
  retention_type: RetentionType;
  number_of_units: number;
  head_contract_sum: number;
  bank_account_type: BankAccountType;
}

export interface IProjectTrustAccount {
  bank_account_id: number;
  bank_account_type: BankAccountType;
  opening_date: Date;
  delegate_powers: DelegatePowers;
  current_balance?: number;
}

export interface IRetentionTrustAccount {
  bank_account_id: number;
  bank_account_type: BankAccountType;
  opening_date: Date;
  delegate_powers: DelegatePowers;
  retention_trust_certificate_attachment_ids: string[];
  company_id: number;
}

export interface IFetchedAllContents {
  id: string;
  check_number: number;
  check_name: string;
  rule_number: number;
  bank_account_type: BankAccountType;
  is_active: boolean;
  content: string;
  created_on: Date;
  updated_on: Date;
  created_group: string;
  updated_group: string;
}

export interface IFetchedAllRules {
  check_number: number;
  check_name: string;
  display_message: string;
  display_message_colour: string;
  action_button_type: ActionButtonType;
  check_status: string;
  rule_number: number;
}

export interface ISwitchComplianceChecksOfPTA {
  checkContractEligibility: boolean;
  openProjectTrustAccount: boolean;
  notifyPartiesOfTheTrustAccount: boolean;
  administrationOfTheAccount: boolean;
  paymentsFromThePrincipal: boolean;
  paymentsToSubcontractors: boolean;
  paymentsToYourselfAsTrustee: boolean;
  monthlyReconciliationsAndRecordkeeping: boolean;
  closeTheAccount: boolean;
}

export interface ISwitchComplianceChecksOfRTA {
  checkContractEligibility: boolean;
  openRetentionTrustAccount: boolean;
  notifyPartiesOfTheTrustAccount: boolean;
  administrationOfTheAccount: boolean;
  withholdingRetentionAmountsFromPayment: boolean;
  releasingRetentionAmountsToContractedParties: boolean;
  releasingRetentionAmountsToSomeoneElseFromTheAccount: boolean;
  releasingRetentionAmountsToYourselfAsTrustee: boolean;
  monthlyReconciliationsAndRecordkeeping: boolean;
  closeTheAccount: boolean;
}
