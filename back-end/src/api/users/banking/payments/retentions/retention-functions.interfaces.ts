import {
  BeneficiaryType,
  CashRetentionType,
  PaymentClaimTypes,
  PaymentStatuses,
  PaymentTypes,
} from 'src/libs/@paytrade-types/paytrade-types';

export interface ICreateMatchedRetentionInPayment {
  sub_payment_id: number;
  payment_id: number;
  retained_amount: number;
  beneficiary_type: BeneficiaryType;
  company_id: number;
  payment_type: PaymentTypes;
  status: PaymentStatuses;
  created_by: number;
  retention_account?: number;
  payment_from_account?: number;
  payment_to_account?: number;
  client_supplier_id: number;
  cash_retention_type: CashRetentionType;
  claim_type: PaymentClaimTypes;
}

export interface ICreateMatchedRetentionPaymentInRetentionSummary {
  associated_retention_sub_payment_id: number;
  payment_type: PaymentTypes;
  total_amount: number;
  beneficiary_type: BeneficiaryType;
  created_by: number;
  payless_amount: number;
  sub_payment_id: number;
  company_id: number;
  claim_amount: number;
  payment_id: number;
  payment_claim_id: number;
  retention_id: number;
  client_supplier_id: number;
  cash_retention_type: CashRetentionType;
  claim_type: PaymentClaimTypes;
  retention_account: number;
  payment_from_account: number;
  payment_to_account: number;
}

export interface IDelateRetentionInPaymentEntries {
  claim_type: PaymentClaimTypes;
  sub_payment_id: number;
}

export interface IDeleteAllRetentionPaymentEntriesInSummaryAndList {
  sub_payment_id: number;
  retention_id: number;
  payment_type: PaymentTypes;
  payment_id: number;
  payment_claim_id: number;
}

export interface IUpdateRetentionStatus {
  retention_id: number;
  payment_id: number;
}

export interface IUpdatePaymentGeneratedStatusOfRetention {
  payment_id: number;
  payment_type: PaymentTypes;
}

export interface IUpdateClaimCompletedStatusOfRetention {
  sub_payment_id: number;
}
