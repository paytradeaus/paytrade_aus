import { InputType, Field } from '@nestjs/graphql';
import {
  ClientSupplierStatus,
  ClientSupplierType,
} from 'src/entities/client-suppliers-details.entity';
import { ContractStatus } from 'src/entities/contract-details.entity';
import {
  ProjectRole,
  ProjectStatus,
} from 'src/entities/project-details.entity';
import { PlanType } from 'src/entities/subscription-plan-details.entity';
import { VariationStatus } from 'src/entities/variation-details.entity';
import {
  BalanceCheck,
  BankAccountType,
  CashRetentionType,
  ComplianceStatus,
  NoticeTypes,
  PaymentClaimTypes,
} from 'src/libs/@paytrade-types/paytrade-types';

@InputType({
  description:
    'Decoded JWT token details for authorization and activity tracking',
})
export class DecodedTokenInput {
  @Field({
    nullable: true,
    description: 'Indicates whether the user is an admin',
  })
  isAdmin?: boolean;

  @Field({
    nullable: true,
    description: 'Role of the authenticated user',
  })
  role?: string;

  @Field({
    nullable: true,
    description: 'Admin identifier if the user is an admin',
  })
  admin_id?: string;

  @Field({
    nullable: true,
    description: 'User identifier from the decoded token',
  })
  userId?: string;
}

@InputType({
  description:
    'Filters and parameters used for exporting data into Excel format',
})
export class ExportExcelDataInput {
  @Field({
    nullable: true,
    description: 'Custom name of the exported Excel file',
  })
  file_name?: string;

  @Field({
    description: 'Screen name or module identifier for export context',
  })
  screen_name: string;

  @Field({
    nullable: true,
    description: 'Company ID (required for admin-side exports)',
  })
  company_id?: number;

  // ---------------- Project ----------------
  @Field({
    nullable: true,
    description: 'Filter projects by status',
  })
  project_status?: ProjectStatus;

  @Field({
    nullable: true,
    description: 'Filter projects by user role',
  })
  project_role?: ProjectRole;

  @Field({
    nullable: true,
    description: 'Search project by name or ID',
  })
  project_name_or_id?: string;

  // ---------------- Contract ----------------
  @Field({
    nullable: true,
    description: 'Filter contracts by status',
  })
  contract_status?: ContractStatus;

  @Field({
    nullable: true,
    description: 'Project ID associated with the contract',
  })
  project_id?: number;

  @Field({
    nullable: true,
    description: 'Client or supplier type filter',
  })
  client_supplier_type?: ClientSupplierType;

  @Field({
    nullable: true,
    description: 'Global search keyword',
  })
  search?: string;

  // ---------------- Client / Supplier ----------------
  @Field({
    nullable: true,
    description: 'List type for client or supplier data',
  })
  list_type?: string;

  // ---------------- Notices ----------------
  @Field({
    nullable: true,
    description: 'Contract ID related to notices',
  })
  contract_id?: number;

  @Field({
    nullable: true,
    description: 'Bank account ID',
  })
  bank_account_id?: number;

  @Field({
    nullable: true,
    description: 'Payment claim ID',
  })
  payment_claim_id?: number;

  @Field({
    nullable: true,
    description: 'Payment ID',
  })
  payment_id?: number;

  @Field({
    nullable: true,
    description: 'Type of notice',
  })
  notice_type?: NoticeTypes;

  @Field({
    nullable: true,
    description: 'Generic status filter',
  })
  status?: string;

  @Field({
    nullable: true,
    description: 'Indicates if notice is delegated to QBCC',
  })
  delegated_qbcc?: boolean;

  // ---------------- Pagination ----------------
  @Field({
    nullable: true,
    description: 'Page number',
  })
  page?: number;

  @Field({
    nullable: true,
    description: 'Items per page',
  })
  items_per_page?: number;

  // ---------------- Date Filters ----------------
  @Field({
    nullable: true,
    description: 'Date filter type (e.g. today, this_month)',
  })
  date_filter?: string;

  @Field({
    nullable: true,
    description: 'Start date for date range filtering',
  })
  start_date?: Date;

  @Field({
    nullable: true,
    description: 'End date for date range filtering',
  })
  end_date?: Date;

  // ---------------- Bank Account ----------------
  @Field({
    nullable: true,
    description: 'Type of bank account',
  })
  account_type?: BankAccountType;

  @Field({
    nullable: true,
    description: 'Sort results in alphabetical order',
  })
  is_alphabetical_order?: boolean;

  // ---------------- Payment Claims ----------------
  @Field({
    nullable: true,
    description: 'Payment claim type',
  })
  claim_type?: PaymentClaimTypes;

  @Field({
    nullable: true,
    description: 'Cash retention type',
  })
  cash_retention_type?: CashRetentionType;

  @Field({
    nullable: true,
    description: 'Client or supplier ID',
  })
  client_supplier_id?: number;

  @Field({
    nullable: true,
    description: 'Contact (client/supplier) ID used to filter contracts',
  })
  contact_id?: number;

  // ---------------- Retention / Payments ----------------
  @Field({
    nullable: true,
    description: 'Page number for retention listing',
  })
  page_number?: number;

  @Field({
    nullable: true,
    description: 'Claim ID',
  })
  claim_id?: number;

  @Field({
    nullable: true,
    defaultValue: null,
    description: 'Page size for pagination',
  })
  page_size?: number;

  @Field({
    nullable: true,
    description: 'Payment type',
  })
  payment_type?: string;

  @Field({
    nullable: true,
    description: 'Indicates whether payment is confirmed as paid',
  })
  is_paid_confirmed?: boolean;

  @Field({
    nullable: true,
    description: 'Keyword-based search filter',
  })
  keyword?: string;

  // ---------------- Sub Payments ----------------
  @Field({
    nullable: true,
    description: 'Indicates if sub-payment is confirmed',
  })
  is_confirmed?: boolean;

  @Field({
    nullable: true,
    description: 'Indicates if payment is late',
  })
  is_late?: boolean;

  @Field({
    nullable: true,
    description: 'Sub-payment type',
  })
  sub_payment_type?: string;

  @Field({
    nullable: true,
    description: 'Timezone for date calculations',
  })
  timezone?: string;

  // ---------------- Activity Log ----------------
  @Field({
    nullable: true,
    description: 'Decoded token details for audit and activity logs',
  })
  decodedToken?: DecodedTokenInput;

  @Field({
    nullable: true,
    description: 'User ID for filtering logs',
  })
  user_id?: number;

  @Field({
    nullable: true,
    description: 'Admin ID for filtering logs',
  })
  admin_id?: number;

  @Field({
    nullable: true,
    description: 'Event group identifier',
  })
  event_group?: string;

  // ---------------- Transactions ----------------
  @Field({
    nullable: true,
    description: 'Indicates receivable transactions',
  })
  is_receivable?: boolean;

  @Field({
    nullable: true,
    description: 'Transaction start date',
  })
  date_from?: Date;

  @Field({
    nullable: true,
    description: 'Transaction end date',
  })
  date_to?: Date;

  // ---------------- Bank Statements ----------------
  @Field({
    nullable: true,
    description: 'Bank statement added date (from)',
  })
  added_date_from?: Date;

  @Field({
    nullable: true,
    description: 'Bank statement added date (to)',
  })
  added_date_to?: Date;

  // ---------------- Reconciliation ----------------
  @Field({
    nullable: true,
    description: 'Indicates archived records',
  })
  isArchived?: boolean;

  // ---------------- Compliance ----------------
  @Field({
    nullable: true,
    description: 'PTA compliance status',
  })
  pta_compliance?: ComplianceStatus;

  @Field({
    nullable: true,
    description: 'RTA compliance status',
  })
  rta_compliance?: ComplianceStatus;

  // ---------------- User / Business ----------------
  @Field({
    nullable: true,
    description: 'Number of records to skip',
  })
  skip?: number;

  @Field({
    nullable: true,
    description: 'Number of records to take',
  })
  take?: number;

  @Field({
    nullable: true,
    description: 'Subscription plan name',
  })
  plan?: string;

  @Field({
    nullable: true,
    description: 'Records per page',
  })
  perPage?: number;

  @Field({
    nullable: true,
    description: 'Indicates blocked users',
  })
  blocked?: boolean;

  // ---------------- Subscription ----------------
  @Field({
    nullable: true,
    description: 'Plan type for subscription management',
  })
  plan_type?: PlanType;

  // ---------------- Journals ----------------
  @Field({
    nullable: true,
    description: 'Balance check type',
  })
  balance_check?: BalanceCheck;

  // ---------------- Content ----------------
  @Field({
    nullable: true,
    description: 'Content page type',
  })
  pageType?: string;

  @Field({
    nullable: true,
    description: 'FAQ category',
  })
  category?: string;

  @Field({
    nullable: true,
    description: 'FAQ status',
  })
  faq_status?: string;

  @Field({
    nullable: true,
    description: 'Email template type',
  })
  mailType?: string;

  // ---------------- Blog ----------------
  @Field({
    nullable: true,
    description: 'Blog author name',
  })
  author?: string;

  @Field({
    nullable: true,
    description: 'Blog content type',
  })
  contentType?: string;

  // ---------------- Groups / Variations ----------------
  @Field({
    nullable: true,
    description: 'Sort groups alphabetically',
  })
  isAlphabeticalOrder?: boolean;

  @Field({
    nullable: true,
    description: 'Variation status',
  })
  variation_status?: VariationStatus;

  // ---------------- Trust Accounting ----------------
  @Field({
    nullable: true,
    description: 'Enable audit view for journals',
  })
  is_audit_view?: boolean;

  @Field({
    nullable: true,
    description: 'Beneficiary name',
  })
  beneficiary?: string;

  @Field({
    nullable: true,
    description: 'Report ID',
  })
  report_id?: number;

  // ---------------- Coupons ----------------
  @Field({
    nullable: true,
    description: 'Coupon ID',
  })
  coupon_id?: number;
}
