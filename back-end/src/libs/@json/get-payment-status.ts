import { paymentStatus } from './payment-status';
import { paymentStatusArray } from './payment-status-json';

interface StatusOptions {
  claimStatusInDb?: string;
  claimType?: string;
  paymentStatusInDb?: string;
  retentionStatusInDb?: string;
  paymentType?: string;
  paymentTo?: string;
  cashRetentionType?: string;
  isPaidConfirmed?: boolean;
  isRetentionConfirmed?: boolean;
  isReceivedConfirmed?: boolean;
}

interface StatusResult {
  claim_status_in_ui: string;
  payment_status_in_ui: string;
}

interface PaymentStatusOptions {
  cash_retention_type?: string;
  claim_type?: string;
  payment_type?: string;
  cash_retention?: Boolean;
  is_paid_confirmed?: Boolean;
  is_received_confirmed?: Boolean;
  is_retention_confirmed?: Boolean;
  payment_matched?: Boolean;
  retention_out_matched?: Boolean;
  retention_in_matched?: Boolean;
}

interface StatusToDbResult {
  claim_status: string;
  payment_status: string;
  list_status: string;
}

export async function getStatusUI(
  options: StatusOptions,
): Promise<StatusResult> {
  // console.log('options: ', options);
  const filteredStatus = paymentStatusArray.filter((status) => {
    return (
      (!options.claimStatusInDb ||
        status.claim_status_in_db === options.claimStatusInDb) &&
      (!options.claimType || status.claim_type.includes(options.claimType)) &&
      (!options.paymentStatusInDb ||
        status.payment_status_in_db === options.paymentStatusInDb) &&
      (!options.retentionStatusInDb ||
        status.retention_status_in_db === options.retentionStatusInDb) &&
      (!options.paymentType || status.payment_type === options.paymentType) &&
      (!options.cashRetentionType ||
        status.cash_retention_type?.includes(options.cashRetentionType)) &&
      (options.isPaidConfirmed === undefined ||
        status.is_paid_confirmed === options.isPaidConfirmed) &&
      (options.isRetentionConfirmed === undefined ||
        status.is_retention_confirmed === options.isRetentionConfirmed) &&
      (options.isReceivedConfirmed === undefined ||
        status.is_received_confirmed === options.isReceivedConfirmed)
    );
  });

  // Assuming only one status matches the criteria
  if (filteredStatus.length > 0) {
    return {
      claim_status_in_ui: filteredStatus[0].claim_status_in_ui,
      payment_status_in_ui: filteredStatus[0].payment_status_in_ui,
    };
  } else {
    return {
      claim_status_in_ui: 'Status not found',
      payment_status_in_ui: 'Status not found',
    };
  }
}

export async function getStatusForUpdateInDB(
  options: PaymentStatusOptions,
): Promise<StatusToDbResult> {
  // console.log('options: ', options);
  if (
    [
      'Overpayment from client',
      'Underpayment from client',
      'Overpayment to supplier',
      'Underpayment to supplier',
      'Overpayment refund from supplier',
      'Overpayment refund to client',
    ].includes(options.payment_type)
  ) {
    options.claim_type = undefined;
    options.cash_retention_type = undefined;
    options.cash_retention = undefined;
  }
  const filteredStatus = paymentStatus.filter((status) => {
    return (
      (!options.claim_type ||
        status.claim_type?.includes(options.claim_type)) &&
      (!options.cash_retention_type ||
        status.cash_retention_type?.includes(options.cash_retention_type)) &&
      (!options.payment_type ||
        status.payment_type?.includes(options.payment_type)) &&
      (options.cash_retention === undefined ||
        status.cash_retention === options.cash_retention) &&
      (options.is_paid_confirmed === undefined ||
        status.is_paid_confirmed === options.is_paid_confirmed) &&
      (options.is_retention_confirmed === undefined ||
        status.is_retention_confirmed === options.is_retention_confirmed) &&
      (options.is_received_confirmed === undefined ||
        status.is_received_confirmed === options.is_received_confirmed) &&
      (options.payment_matched === undefined ||
        status.payment_matched === options.payment_matched) &&
      (options.retention_out_matched === undefined ||
        status.retention_out_matched === options.retention_out_matched) &&
      (options.retention_in_matched === undefined ||
        status.retention_in_matched === options.retention_in_matched)
    );
  });
  // Assuming only one status matches the criteria
  // console.log('filteredStatus: ', filteredStatus);
  if (filteredStatus.length > 0) {
    return {
      claim_status: filteredStatus[0].claim_status,
      payment_status: filteredStatus[0].payment_status,
      list_status: filteredStatus[0].list_status,
    };
  } else {
    return {
      claim_status: '',
      payment_status: '',
      list_status: '',
    };
  }
}
