import { Field, InputType } from '@nestjs/graphql';
import {
  BankAccountType,
  ComplianceStatus,
} from 'src/libs/@paytrade-types/paytrade-types';

@InputType({
  description:
    'Input for fetching all compliances with pagination and filters.',
})
export class FetchAllCompliancesInput {
  @Field({
    nullable: true,
    description: 'ID of the business to filter compliances.',
  })
  company_id?: number;

  @Field({
    nullable: true,
    description: 'ID of the project to filter compliances.',
  })
  project_id?: number;

  @Field({
    nullable: true,
    description: 'ID of the bank account to filter compliances.',
  })
  bank_account_id?: number;

  @Field({
    nullable: true,
    description:
      'Type of date filter to apply (e.g., "This month", "Last month").',
  })
  date_filter?: string;

  @Field({
    nullable: true,
    description: 'Start date for filtering compliance records.',
  })
  start_date?: Date;

  @Field({
    nullable: true,
    description: 'End date for filtering compliance records.',
  })
  end_date?: Date;

  @Field({ description: 'Page number for pagination.' })
  page_number: number;

  @Field({ description: 'Number of items per page for pagination.' })
  items_per_page: number;

  @Field({
    nullable: true,
    description:
      'Bank account type filter (e.g., Retention Trust Account, Project Trust Account, Cash Account).',
  })
  account_type?: BankAccountType;

  @Field({
    nullable: true,
    description: 'PTA compliance status filter (e.g., Ok, Action required).',
  })
  pta_compliance?: ComplianceStatus;

  @Field({
    nullable: true,
    description: 'RTA compliance status filter (e.g., Ok, Action required).',
  })
  rta_compliance?: ComplianceStatus;

  @Field({ nullable: true, description: 'Field name to sort the results by.' })
  sorting_field?: string;

  @Field({
    nullable: true,
    description: 'Sorting order for the results, either ASC or DESC.',
  })
  sorting_order?: 'ASC' | 'DESC';
}

@InputType({
  description: 'Input to fetch compliance results for a specific project.',
})
export class FetchComplianceResultsOfAProjectInput {
  @Field({ description: 'Project ID to fetch compliance results for.' })
  project_id: number;

  @Field({
    description:
      'Bank account type, either Retention Trust Account or Project Trust Account.',
  })
  bank_account_type: 'Retention Trust Account' | 'Project Trust Account';

  @Field({
    nullable: true,
    description: 'Filter only failed compliance results if true.',
  })
  failedFilter?: boolean;
}

@InputType({
  description: 'Input to silence a specific compliance check for a project.',
})
export class SilenceComplianceOfAProjectInput {
  @Field({ description: 'Project ID associated with the compliance.' })
  project_id: number;

  @Field({
    description:
      'Bank account type, either Retention Trust Account or Project Trust Account.',
  })
  bank_account_type: 'Retention Trust Account' | 'Project Trust Account';

  @Field({ description: 'Compliance check number to silence.' })
  check_number: number;

  @Field({
    nullable: true,
    description: 'Whether mails should be sent when silencing.',
  })
  mails?: boolean;

  @Field({
    nullable: true,
    description: 'Rule number associated with the compliance check.',
  })
  rule_number?: number;

  @Field({
    nullable: true,
    description: 'Whether notification should be sent when silenced.',
  })
  notify?: boolean;
}

@InputType({
  description:
    'Input to fetch all compliance results for a business dashboard.',
})
export class FetchAllComplianceResultsInDashboardInput {
  @Field({
    description: 'business ID to fetch dashboard compliance results for.',
  })
  company_id: number;
}

@InputType({
  description: 'Input to fetch compliance statuses for a specific project.',
})
export class FetchComplianceStatusesOfAProjectInput {
  @Field({ description: 'Project ID to fetch compliance statuses for.' })
  project_id: number;
}
