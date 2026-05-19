import { InputType, Field, Int, Float } from '@nestjs/graphql';
import { Group } from 'src/entities/user-details.entity';
import {
  NoticeStatus,
  NoticeTypes,
  NoticeView,
} from 'src/libs/@paytrade-types/paytrade-types';

@InputType({
  description:
    'Input for generating a notice for a business, project, contract, payment, audit, etc.',
})
export class generateNoticeInput {
  @Field({
    description: 'ID of the business for which the notice is generated.',
  })
  company_id: number;

  @Field({
    nullable: true,
    description: 'ID of the project related to the notice, if applicable.',
  })
  project_id?: number;

  @Field({
    nullable: true,
    description: 'ID of the contract related to the notice, if applicable.',
  })
  contract_id?: number;

  @Field({ nullable: true, description: 'Type of notice to be generated.' })
  notice_type?: NoticeTypes;

  @Field({
    nullable: true,
    description: 'ID of the bank account associated with the notice.',
  })
  bank_account_id?: number;

  @Field({
    nullable: true,
    description: 'ID of the payment claim associated with the notice.',
  })
  payment_claim_id?: number;

  @Field({
    nullable: true,
    description: 'ID of the payment associated with the notice.',
  })
  payment_id?: number;

  @Field({
    nullable: true,
    description: 'ID of the audit associated with the notice.',
  })
  audit_id?: number;

  @Field({ nullable: true, description: 'Template ID to use for the notice.' })
  notice_template_id?: number;

  @Field({
    nullable: true,
    description: 'Source of the notice, e.g., system-generated or manual.',
  })
  notice_source?: string;

  @Field(() => [String], {
    nullable: true,
    description: 'Array of attachment IDs to include as supporting files.',
  })
  supporting_file_attachment_ids?: string[];

  @Field({
    nullable: true,
    description: 'Client or supplier ID associated with the notice.',
  })
  client_supplier_id?: number;

  @Field({
    nullable: true,
    description: 'Whether the notice is delegated to a QBCC user.',
  })
  delegated_qbcc?: boolean;

  @Field({
    nullable: true,
    description: 'Whether the notice is related to retention.',
  })
  is_retention?: boolean;

  @Field({
    nullable: true,
    description:
      'If true, generates the notice only for preview without sending.',
  })
  view_preview?: boolean;

  @Field({
    nullable: true,
    defaultValue: false,
    description: 'Indicates if the notice is a received notice.',
  })
  is_recieved_notice?: boolean;

  @Field({
    nullable: true,
    description: 'Indicates if the notice has an import button enabled.',
  })
  has_import_button?: boolean;
}

@InputType({
  description: 'Input to trigger notice generation for a contract.',
})
export class triggerContractNoticesInput {
  @Field({ nullable: true, description: 'ID of the contract.' })
  contract_id?: number;

  @Field({
    nullable: true,
    description: 'If true, only generates a preview of the notice.',
  })
  view_preview?: boolean;
}

@InputType({
  description: 'Input to trigger notice generation for a bank account.',
})
export class triggerAccountNoticesInput {
  @Field({ nullable: true, description: 'ID of the bank account.' })
  bank_account_id?: number;

  @Field({
    nullable: true,
    description:
      'If true, generated notices are immediately marked as Sent (the user has lodged them outside the system) and no email is dispatched.',
  })
  mark_notices_as_sent?: boolean;
}

@InputType({
  description: 'Input to trigger notice generation for a payment claim.',
})
export class triggerPaymentClaimNoticesInput {
  @Field({ description: 'ID of the payment claim.' })
  payment_claim_id: number;

  @Field({
    nullable: true,
    description: 'If true, only generates a preview of the notice.',
  })
  view_preview?: boolean;
}

@InputType({ description: 'Input to trigger notice generation for an audit.' })
export class triggerAuditNoticesInput {
  @Field({ description: 'ID of the audit.' })
  audit_id: number;

  @Field({
    nullable: true,
    description: 'If true, only generates a preview of the notice.',
  })
  view_preview?: boolean;
}

@InputType({
  description: 'Input to trigger notice generation for multiple payments.',
})
export class triggerPaymentNoticesInput {
  @Field(() => [Number], {
    description: 'Array of payment IDs for which notices should be triggered.',
  })
  payment_ids: number[];

  @Field({
    nullable: true,
    description: 'If true, only generates a preview of the notice.',
  })
  view_preview?: boolean;
}

@InputType({ description: 'Input to fetch the details of a specific notice.' })
export class FetchDetailsOfANoticeInput {
  @Field({ description: 'ID of the notice to fetch details for.' })
  id: string;
}

@InputType({ description: 'Input to generate an email for a specific notice.' })
export class GenerateMailForANoticeInput {
  @Field({ description: 'ID of the notice.' })
  id: string;

  @Field({
    nullable: true,
    description: 'If true, adds an import button in the email generation.',
  })
  has_import_button?: boolean;
}

@InputType({ description: 'Input to send an email for a specific notice.' })
export class SentMailForANoticeInput {
  @Field({ description: 'ID of the notice.' })
  id: string;

  @Field({
    nullable: true,
    description: 'If true, sends the notice email in preview mode.',
  })
  view_preview?: boolean;
}

@InputType({ description: 'Input to send emails for multiple notices.' })
export class SentMailForMultipleNoticesInput {
  @Field(() => [String], {
    description: 'Array of notice IDs to send emails for.',
  })
  ids: string[];
}

@InputType({ description: 'Input to fetch a notice mail by its ID.' })
export class fetchNoticeMailInput {
  @Field({ description: 'ID of the notice mail to fetch.' })
  id: string;
}

@InputType({
  description:
    'Input to list all mails of a specific notice with pagination and sorting.',
})
export class ListAllMailsofANoticesInput {
  @Field({ description: 'ID of the notice.' })
  notice_id: number;

  @Field({ nullable: true, description: 'Page number for pagination.' })
  page?: number;

  @Field({
    nullable: true,
    description: 'Number of items per page for pagination.',
  })
  items_per_page?: number;

  @Field({
    nullable: true,
    description: 'Field by which the results should be sorted.',
  })
  sorting_field?: string;

  @Field({ nullable: true, description: 'Sorting order: ASC or DESC.' })
  sorting_order?: 'ASC' | 'DESC';
}

@InputType({
  description:
    'Input to list all notices with optional filtering, pagination, and sorting.',
})
export class ListAllNoticesInput {
  @Field({ nullable: true, description: 'Filter by business ID.' })
  company_id?: number;

  @Field({ nullable: true, description: 'Filter by project ID.' })
  project_id?: number;

  @Field({ nullable: true, description: 'Filter by contract ID.' })
  contract_id?: number;

  @Field({ nullable: true, description: 'Filter by bank account ID.' })
  bank_account_id?: number;

  @Field({ nullable: true, description: 'Filter by payment claim ID.' })
  payment_claim_id?: number;

  @Field({ nullable: true, description: 'Filter by payment ID.' })
  payment_id?: number;

  @Field({ nullable: true, description: 'Filter by notice type.' })
  notice_type?: NoticeTypes;

  @Field({ nullable: true, description: 'Filter by status.' })
  status?: string;

  @Field({ nullable: true, description: 'Text search filter.' })
  search?: string;

  @Field({ nullable: true, description: 'Filter by delegated QBCC flag.' })
  delegated_qbcc?: boolean;

  @Field({ nullable: true, description: 'Page number for pagination.' })
  page?: number;

  @Field({ nullable: true, description: 'Number of items per page.' })
  items_per_page?: number;

  @Field({
    nullable: true,
    description: 'Filter by date type (created, sent, etc.).',
  })
  date_filter?: string;

  @Field({ nullable: true, description: 'Filter by start date.' })
  start_date?: Date;

  @Field({ nullable: true, description: 'Filter by end date.' })
  end_date?: Date;

  @Field({ nullable: true, description: 'Field by which to sort the results.' })
  sorting_field?: string;

  @Field({ nullable: true, description: 'Sorting order: ASC or DESC.' })
  sorting_order?: 'ASC' | 'DESC';
}

@InputType({
  description: 'Input to list all delegates associated with notices.',
})
export class ListAllDelegatesInput {
  @Field({ nullable: true, description: 'Filter by business ID.' })
  company_id?: number;

  @Field({ nullable: true, description: 'Filter by bank account ID.' })
  bank_account_id?: number;

  @Field({ nullable: true, description: 'Page number for pagination.' })
  page?: number;

  @Field({
    nullable: true,
    description: 'Number of items per page for pagination.',
  })
  items_per_page?: number;

  @Field({ nullable: true, description: 'Field by which to sort the results.' })
  sorting_field?: string;

  @Field({ nullable: true, description: 'Sorting order: ASC or DESC.' })
  sorting_order?: 'ASC' | 'DESC';
}

@InputType({
  description:
    'Input to update notice details such as status, delegation, or references.',
})
export class updateNoticesInput {
  @Field({ description: 'ID of the notice to update.' })
  notice_id: number;

  @Field({ nullable: true, description: 'Updated status of the notice.' })
  status?: string;

  @Field({
    nullable: true,
    description: 'UUID of the notice mail if applicable.',
  })
  notice_mail_uuid?: string;

  @Field({ nullable: true, description: 'Update delegated QBCC flag.' })
  delegated_qbcc?: boolean;

  @Field({
    nullable: true,
    description: 'If true, indicates notice is auto sent.',
  })
  auto_sent?: boolean;

  @Field({ nullable: true, description: 'QBCC flag update.' })
  qbcc?: boolean;

  @Field({
    nullable: true,
    description: 'Reference ID associated with the notice.',
  })
  reference_id?: number;

  @Field({
    nullable: true,
    description: 'Reference link associated with the notice.',
  })
  reference_link?: string;

  @Field({ nullable: true, description: 'Recipient name for the notice.' })
  toName?: string;

  @Field({ nullable: true, description: 'Recipient email for the notice.' })
  toMail?: string;

  @Field({
    nullable: true,
    description:
      'Internal NOTICE_FLOW correlation id stamped by trigger handlers; used only for logging.',
  })
  flow_id?: string;
}

@InputType({
  description:
    'Input to update details of a notice mail, including sender, recipient, subject, and content.',
})
export class updateNoticesMailInput {
  @Field({ description: 'ID of the notice mail to update.' })
  notice_mail_id: number;

  @Field({ nullable: true, description: 'Email sender address.' })
  email_from?: string;

  @Field({ nullable: true, description: 'Email recipient address.' })
  email_to?: string;

  @Field({ nullable: true, description: 'Email CC addresses.' })
  email_cc?: string;

  @Field({ nullable: true, description: 'Email subject line.' })
  email_subject?: string;

  @Field({ nullable: true, description: 'Email body content.' })
  email_content?: string;
}

@InputType({ description: 'Input to fetch all unsent notices of a business.' })
export class FetchAllUnsentNoticesOfACompanyInput {
  @Field({ description: 'ID of the business.' })
  company_id: number;
}
