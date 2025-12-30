import { Field, InputType } from '@nestjs/graphql';
import { GraphQLJSONObject } from 'graphql-type-json';
import { ClientSupplierType } from 'src/libs/@paytrade-types/paytrade-types';

@InputType({ description: 'Input for exporting audit reports.' })
export class ExportAuditReportInput {
  @Field({ description: 'Start date of the audit report period.' })
  start_date: Date;

  @Field({ description: 'End date of the audit report period.' })
  end_date: Date;

  @Field({ description: 'Bank account ID.' })
  bank_account_id: number;

  @Field({
    nullable: true,
    description: 'Optional project ID to filter audit reports.',
  })
  project_id?: number;
}

@InputType({
  description:
    'Internal service-level input extending audit report export input.',
})
export class AuditReportServiceInput extends ExportAuditReportInput {
  @Field({
    nullable: true,
    description: 'Timezone of the requesting user.',
  })
  timezone?: string;

  @Field(() => GraphQLJSONObject, {
    nullable: true,
    description: 'Decoded JWT token data for internal authorization logic.',
  })
  decodedToken?: Record<string, any>;

  @Field({
    nullable: true,
    description: 'Client or supplier context.',
  })
  client_supplier_type?: ClientSupplierType;

  @Field({
    description: 'Module name triggering the audit report export.',
  })
  module_name: string;
}

export enum AuditReportModuleEnum {
  AuditReport = 'Audit Report',
  Contract = 'Contract',
  ContractWithClient = 'Contract with client',
  ContractWithSupplier = 'Contract with supplier',
  Variation = 'Variation',
  ClientPaymentClaim = 'Client payment claims',
  ClientNotice = 'Notices',
  SupplierSubConPaymentClaim = 'Supplier-Subcontractor Payment Claims',
  SupplierSubConPaymentSchedule = 'Supplier-Subcontractor Payments Schedule',
  BankStatement = 'Bank Statements',
  PaymentInstructionFile = 'Payment Instruction File',
  AccountingRecords = 'Accounting Records',
  ReceivedNotice = 'Received notices',
}
