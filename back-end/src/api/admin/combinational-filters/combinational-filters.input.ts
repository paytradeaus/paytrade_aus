import { InputType, Field } from '@nestjs/graphql';
import {
  BankAccountType,
  CashRetentionType,
  NoticeTypes,
  PaymentClaimStatuses,
  PaymentClaimTypes,
} from 'src/libs/@paytrade-types/paytrade-types';

@InputType({
  description: 'Filters used for fetching trust accounting records',
})
export class FetchFiltersForTrustAccountingInput {
  @Field({ nullable: true, description: 'ID of the company' })
  company_id: number;

  @Field({ nullable: true, description: 'ID of the bank account' })
  bank_account_id: number;

  @Field({ nullable: true, description: 'Type of the bank account' })
  account_type: BankAccountType;
}

@InputType({ description: 'Filters used for fetching notice records' })
export class FetchFiltersForNoticeInput {
  @Field({ nullable: true, description: 'ID of the company' })
  company_id: number;

  @Field({ nullable: true, description: 'ID of the bank account' })
  bank_account_id: number;

  @Field({ nullable: true, description: 'Type of the bank account' })
  account_type: BankAccountType;

  @Field({ nullable: true, description: 'Type of notice' })
  notice_type: NoticeTypes;

  @Field({ nullable: true, description: 'Status of the notice' })
  status: string;

  @Field({
    nullable: true,
    description: 'ID of the project associated with the notice',
  })
  project_id: number;

  @Field({
    nullable: true,
    description: 'Indicates whether the notice is delegated to QBCC',
  })
  delegated_qbcc: boolean;
}

@InputType({ description: 'Filters used for fetching compliance records' })
export class FetchFiltersForComplianceInput {
  @Field({ nullable: true, description: 'ID of the company' })
  company_id: number;

  @Field({ nullable: true, description: 'ID of the bank account' })
  bank_account_id: number;

  @Field({
    nullable: true,
    description: 'ID of the project associated with compliance',
  })
  project_id: number;

  @Field({ nullable: true, description: 'Type of the bank account' })
  account_type: BankAccountType;
}
