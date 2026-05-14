import { Field, ObjectType } from '@nestjs/graphql';
import { ProjectStatus } from 'src/entities/project-details.entity';
import {
  ActionButtonType,
  BankAccountType,
  ComplianceChecksOfPTA,
  ComplianceChecksOfRTA,
  ComplianceStatus,
} from 'src/libs/@paytrade-types/paytrade-types';
import { ApiStatusType } from 'src/libs/@response-framer/response-framer';

@ObjectType({
  description: 'Represents a single compliance record for a project.',
})
export class FetchAllCompliances {
  @Field({ description: 'ID of the project.' })
  project_id: number;

  @Field({ nullable: true, description: 'Name of the project.' })
  project_name?: string;

  @Field({ description: 'Date when the project was added.' })
  project_added_on_date: Date;

  @Field({ nullable: true, description: 'Site address of the project.' })
  site_address?: string;

  @Field({ nullable: true, description: 'Role associated with the project.' })
  role?: string;

  @Field({
    description:
      'Compliance status of the Project Trust Account (PTA) (e.g., Ok, Action required).',
  })
  pta_compliance: ComplianceStatus;

  @Field({
    description:
      'Compliance status of the Retention Trust Account (RTA) (e.g., Ok, Action required).',
  })
  rta_compliance: ComplianceStatus;

  @Field({
    description:
      'Overall project status (e.g., Draft, In Progress, Completed, Archived, Deleted).',
  })
  status: ProjectStatus;

  @Field({
    nullable: true,
    description: 'ID of the business the project belongs to.',
  })
  company_id?: number;

  @Field({
    nullable: true,
    description: 'Name of the business the project belongs to.',
  })
  company_name?: string;
}

@ObjectType({
  description: 'Container for multiple compliance records with total count.',
})
export class FetchAllCompliancesWithCount {
  @Field({ description: 'Total number of compliance records.' })
  total_count: number;

  @Field(() => [FetchAllCompliances], {
    description: 'List of compliance records.',
  })
  results: FetchAllCompliances[];
}

@ObjectType({
  description: 'Response for fetching all compliances with count and status.',
})
export class FetchAllCompliancesResponse {
  @Field({ description: 'API response status.' })
  status: ApiStatusType;

  @Field({
    description: 'Message providing additional information about the response.',
  })
  message: string;

  @Field({
    nullable: true,
    description: 'Data containing compliance records and total count.',
  })
  data?: FetchAllCompliancesWithCount;
}

@ObjectType({ description: 'Detailed compliance result of a project check.' })
export class FetchComplianceResultsOfAProject {
  @Field({ description: 'Compliance check number.' })
  check_number: number;

  @Field({ description: 'Name of the compliance check (PTA or RTA).' })
  check_name: ComplianceChecksOfPTA | ComplianceChecksOfRTA;

  @Field({
    nullable: true,
    description: 'Status of the compliance check (PASSED/FAILED).',
  })
  check_status?: 'PASSED' | 'FAILED';

  @Field({
    nullable: true,
    description: 'Detailed content or notes about the compliance check.',
  })
  content?: string;

  @Field({
    nullable: true,
    description: 'Rule number associated with the compliance check.',
  })
  rule_number?: number;

  @Field({
    nullable: true,
    description: 'Message to display to the user about the check.',
  })
  display_message?: string;

  @Field({
    nullable: true,
    description: 'Colour code for displaying the compliance message.',
  })
  display_message_colour?: string;

  @Field({
    nullable: true,
    description: 'Action button type associated with the compliance check.',
  })
  action_button_type?: ActionButtonType;

  @Field({
    nullable: true,
    description: 'Indicates whether the user should be notified.',
  })
  notify?: boolean;

  @Field({
    nullable: true,
    description: 'Reference ID for the compliance check.',
  })
  reference_id?: string;
}

@ObjectType({ description: 'Compliance status summary of a project.' })
export class FetchComplianceStatusesOfAProject {
  @Field({ nullable: true, description: 'Name of the project.' })
  project_name?: string;

  @Field({
    nullable: true,
    description:
      'PTA compliance status of the project (e.g., Ok, Action required).',
  })
  pta_compliance?: ComplianceStatus;

  @Field({
    nullable: true,
    description:
      'RTA compliance status of the project (e.g., Ok, Action required).',
  })
  rta_compliance?: ComplianceStatus;

  @Field({ nullable: true, description: 'Number of compliance issues in PTA.' })
  number_of_issues_in_pta?: number;

  @Field({ nullable: true, description: 'Number of compliance issues in RTA.' })
  number_of_issues_in_rta?: number;

  @Field({
    nullable: true,
    description: 'Indicates if PTA compliance issues are silenced.',
  })
  pta_compliance_silenced?: boolean;

  @Field({
    nullable: true,
    description: 'Indicates if RTA compliance issues are silenced.',
  })
  rta_compliance_silenced?: boolean;
}

@ObjectType({
  description: 'Response for fetching compliance statuses of a project.',
})
export class FetchComplianceStatusesOfAProjectResponse {
  @Field({ description: 'API response status.' })
  status: ApiStatusType;

  @Field({
    description: 'Message providing additional information about the response.',
  })
  message: string;

  @Field({
    nullable: true,
    description: 'Compliance status data for the project.',
  })
  data?: FetchComplianceStatusesOfAProject;
}

@ObjectType({ description: 'Basic project compliance details.' })
export class FetchProjectDetails {
  @Field({ nullable: true, description: 'Name of the project.' })
  project_name?: string;

  @Field({
    description:
      'PTA compliance status of the project (e.g., Ok, Action required).',
  })
  pta_compliance: ComplianceStatus;

  @Field({
    description:
      'RTA compliance status of the project (e.g., Ok, Action required).',
  })
  rta_compliance: ComplianceStatus;
}

@ObjectType({
  description:
    'Compliance results grouped with additional display information.',
})
export class FetchComplianceResults {
  @Field({ nullable: true, description: 'Compliance check number.' })
  check_number?: number;

  @Field({
    nullable: true,
    description: 'Display number for the compliance check.',
  })
  display_check_number?: number;

  @Field({
    nullable: true,
    description: 'Colour code representing compliance status.',
  })
  check_colour_code?: string;

  @Field({
    nullable: true,
    description: 'Indicates if mails are associated with this compliance.',
  })
  mails?: boolean;

  @Field(() => [FetchComplianceResultsOfAProject], {
    nullable: true,
    description: 'List of detailed compliance results.',
  })
  results?: FetchComplianceResultsOfAProject[];
}

@ObjectType({
  description: 'Response for fetching compliance results of a project.',
})
export class FetchComplianceResultsOfAProjectResponse {
  @Field({ description: 'API response status.' })
  status: ApiStatusType;

  @Field({
    description: 'Message providing additional information about the response.',
  })
  message: string;

  @Field(() => [FetchComplianceResults], {
    nullable: true,
    description: 'List of compliance results.',
  })
  data?: FetchComplianceResults[];
}

@ObjectType({ description: 'Compliance result summary for dashboard display.' })
export class FetchAllComplianceResultsInDashboard {
  @Field({ nullable: true, description: 'Project ID.' })
  project_id?: number;

  @Field({ nullable: true, description: 'Project name.' })
  project_name?: string;

  @Field({
    nullable: true,
    description:
      'Current project status (e.g., Draft, In Progress, Completed, Archived, Deleted).',
  })
  project_status?: ProjectStatus;

  @Field({
    nullable: true,
    description: 'Bank account ID associated with the project.',
  })
  bank_account_id?: number;

  @Field({ nullable: true, description: 'Bank account name.' })
  bank_account_name?: string;

  @Field({
    nullable: true,
    description: 'Number of compliance issues in this account.',
  })
  number_of_issues?: number;

  @Field({
    nullable: true,
    description:
      'Bank account type (e.g., Retention Trust Account, Project Trust Account, General Account).',
  })
  bank_account_type?: BankAccountType;

  @Field({
    nullable: true,
    description: 'Timestamp when the record was created.',
  })
  created_on?: Date;
}

@ObjectType({
  description:
    'Response for fetching all compliance results for dashboard display.',
})
export class FetchAllComplianceResultsInDashboardResponse {
  @Field({ description: 'API response status.' })
  status: ApiStatusType;

  @Field({
    description: 'Message providing additional information about the response.',
  })
  message: string;

  @Field(() => [FetchAllComplianceResultsInDashboard], {
    nullable: true,
    description: 'List of compliance results for dashboard.',
  })
  data?: FetchAllComplianceResultsInDashboard[];
}
