import { Field, Int, ObjectType } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';

@ObjectType()
export class PreflightOpenItem {
  @Field(() => Int) id: number;
  @Field({ nullable: true }) reference?: string;
  @Field({ nullable: true }) amount?: number;
  @Field({ nullable: true }) status?: string;
  @Field({ nullable: true }) party_name?: string;
  // Task #249 — optional navigation context for stranded retention rows
  // so the front-end can render Release / Move-to quick actions and
  // deep-link to the parent payment without a second round-trip.
  @Field(() => Int, { nullable: true }) payment_id?: number;
  @Field(() => Int, { nullable: true }) contract_id?: number;
  @Field(() => Int, { nullable: true }) project_id?: number;
  @Field({ nullable: true }) project_name?: string;
}

@ObjectType()
export class PreflightLinkedProject {
  @Field(() => Int) project_id: number;
  @Field({ nullable: true }) project_name?: string;
  @Field(() => Int, { nullable: true }) contract_id?: number;
  @Field({ nullable: true }) client_supplier_name?: string;
}

@ObjectType()
export class BankAccountPreflight {
  @Field(() => Int) bank_account_id: number;
  @Field({ nullable: true }) account_name?: string;
  @Field({ nullable: true }) account_type?: string;
  @Field({ nullable: true }) status?: string;
  @Field({ nullable: true }) current_balance?: number;
  @Field(() => Int) open_claims_count: number;
  @Field(() => Int) in_flight_payments_count: number;
  @Field(() => Int) open_retention_count: number;
  @Field(() => Int) unreconciled_transactions_count: number;
  @Field(() => [PreflightOpenItem]) open_claims: PreflightOpenItem[];
  @Field(() => [PreflightOpenItem]) in_flight_payments: PreflightOpenItem[];
  @Field(() => [PreflightOpenItem]) open_retention: PreflightOpenItem[];
  @Field(() => [PreflightLinkedProject]) linked_projects: PreflightLinkedProject[];
  @Field() can_close: boolean;
  @Field() can_transfer: boolean;
  @Field(() => [String]) close_blockers: string[];
  @Field(() => [String]) transfer_blockers: string[];
}

@ObjectType()
export class TrustAccountTransfer {
  @Field(() => Int) transfer_id: number;
  @Field(() => Int) source_bank_account_id: number;
  @Field(() => Int) destination_bank_account_id: number;
  @Field({ nullable: true }) source_account_name?: string;
  @Field({ nullable: true }) destination_account_name?: string;
  @Field() transfer_date: Date;
  @Field() amount: number;
  @Field() status: string;
  @Field(() => Int, { nullable: true }) transfer_payment_id?: number;
  @Field({ nullable: true }) bank_transfer_reference?: string;
  @Field(() => GraphQLJSON, { nullable: true }) carry_across_choices?: Record<string, any>;
  @Field({ nullable: true }) last_error?: string;
  @Field({ nullable: true }) cutover_applied_at?: Date;
  @Field() created_on: Date;
}

@ObjectType()
export class StartTransferResponse {
  @Field({ nullable: true }) successMessage?: string;
  @Field({ nullable: true }) warningMessage?: string;
  @Field({ nullable: true }) warning?: boolean;
  @Field(() => TrustAccountTransfer, { nullable: true }) transfer?: TrustAccountTransfer;
}

@ObjectType()
export class CutoverDryRunSummary {
  @Field(() => Int) contracts_to_repoint: number;
  @Field(() => Int) in_flight_payments_to_repoint: number;
  @Field(() => Int) retention_rows_to_migrate: number;
  @Field(() => [String]) notes: string[];
}

@ObjectType()
export class ConfirmTransferResponse {
  @Field({ nullable: true }) successMessage?: string;
  @Field({ nullable: true }) warningMessage?: string;
  @Field({ nullable: true }) warning?: boolean;
  @Field(() => TrustAccountTransfer, { nullable: true }) transfer?: TrustAccountTransfer;
  @Field(() => CutoverDryRunSummary, { nullable: true }) dry_run_summary?: CutoverDryRunSummary;
}

@ObjectType()
export class TransferListResponse {
  @Field(() => [TrustAccountTransfer]) transfers: TrustAccountTransfer[];
}

@ObjectType()
export class RelocateStrandedRetentionResponse {
  @Field({ nullable: true }) successMessage?: string;
  @Field({ nullable: true }) warningMessage?: string;
  @Field({ nullable: true }) warning?: boolean;
  @Field(() => Int, { nullable: true }) relocated_count?: number;
  @Field(() => Int, { nullable: true }) payments_repointed?: number;
}

@ObjectType()
export class PreflightResponse {
  @Field({ nullable: true }) warning?: boolean;
  @Field({ nullable: true }) warningMessage?: string;
  @Field(() => BankAccountPreflight, { nullable: true }) preflight?: BankAccountPreflight;
}
