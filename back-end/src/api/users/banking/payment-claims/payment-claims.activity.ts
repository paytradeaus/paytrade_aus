import { linkExtensions } from 'src/api/common/activity-log/link-extensions';
import {
  BeneficiaryType,
  CashRetentionType,
  PaymentClaimTypes,
  PaymentTypes,
} from 'src/libs/@paytrade-types/paytrade-types';

export interface IGeneratePaymentClaimLink {
  payment_claim_id: number;
  cash_retention_type: CashRetentionType;
  beneficiary_type?: BeneficiaryType;
  payment_type?: PaymentTypes;
  payment_id?: number;
  claim_type: PaymentClaimTypes;
}

export function generatePaymentClaimLink(data: IGeneratePaymentClaimLink) {
  try {
    const {
      cash_retention_type,
      claim_type,
      payment_claim_id,
      beneficiary_type,
      payment_type,
      payment_id,
    } = data;
    let paymentClaimLink;
    switch (cash_retention_type) {
      case 'Claim':
        {
          switch (claim_type) {
            case 'Billable':
              {
                //  https://pt-stg.claritazlabs.com:3002/user/pay-apps/payment-claims/overview/100204?
                //  type=Claim&cash-retention-type=&beneficiary=&payment-type=Full&payment=10000000231&ctype=Billable

                paymentClaimLink =
                  `${process.env.LOG_BASE_URL}` +
                  `${linkExtensions[8]}` +
                  `${payment_claim_id}` +
                  `?type=` +
                  `${cash_retention_type ? cash_retention_type : ''}` +
                  `&cash-retention-type=` +
                  `${cash_retention_type ? cash_retention_type : ''}` +
                  `&beneficiary=` +
                  `${beneficiary_type ? beneficiary_type : ''}` +
                  `&payment-type=` +
                  `${payment_type ? payment_type : ''}` +
                  `&payment=` +
                  `${payment_id ? payment_id : ''}` +
                  `&ctype=` +
                  `${claim_type ? claim_type : ''}` +
                  `&from=log`;
              }
              break;
            case 'Receivable':
              {
                //  https://pt-stg.claritazlabs.com:3002/user/pay-apps/payment-claims/overview/100200?
                //  type=Claim&cash-retention-type=&beneficiary=&payment-type=Full&payment=10000000225&ctype=Receivable

                paymentClaimLink =
                  `${process.env.LOG_BASE_URL}` +
                  `${linkExtensions[8]}` +
                  `${payment_claim_id}` +
                  `?type=` +
                  `${cash_retention_type ? cash_retention_type : ''}` +
                  `&cash-retention-type=` +
                  `${cash_retention_type ? cash_retention_type : ''}` +
                  `&beneficiary=` +
                  `${beneficiary_type ? beneficiary_type : ''}` +
                  `&payment-type=` +
                  `${payment_type ? payment_type : ''}` +
                  `&payment=` +
                  `${payment_id ? payment_id : ''}` +
                  `&ctype=` +
                  `${claim_type ? claim_type : ''}` +
                  `&from=log`;
              }
              break;
          }
        }
        break;
      case 'Retention claim':
        {
          switch (claim_type) {
            case 'Billable':
              {
                // https://pt-stg.claritazlabs.com:3002/user/pay-apps/payment-claims/overview/100161?
                // type=Retention%20claim&cash-retention-type=RetentionClaim&beneficiary=Current%20supplier&payment-type=&payment=&ctype=Billable

                paymentClaimLink =
                  `${process.env.LOG_BASE_URL}` +
                  `${linkExtensions[8]}` +
                  `${payment_claim_id}` +
                  `?type=` +
                  `${cash_retention_type ? cash_retention_type : ''}` +
                  `&cash-retention-type=` +
                  `${cash_retention_type ? (cash_retention_type === 'Retention claim' ? 'RetentionClaim' : '') : ''}` +
                  `&beneficiary=` +
                  `${beneficiary_type ? beneficiary_type : ''}` +
                  `&payment-type=` +
                  `${payment_type ? payment_type : ''}` +
                  `&payment=` +
                  `${payment_id ? payment_id : ''}` +
                  `&ctype=` +
                  `${claim_type ? claim_type : ''}` +
                  `&from=log`;
              }
              break;
            case 'Receivable':
              {
                // https://pt-stg.claritazlabs.com:3002/user/pay-apps/payment-claims/overview/100218?
                // type=Retention%20claim&cash-retention-type=RetentionClaim&beneficiary=Current%20supplier&payment-type=&payment=&ctype=Receivable

                paymentClaimLink =
                  `${process.env.LOG_BASE_URL}` +
                  `${linkExtensions[8]}` +
                  `${payment_claim_id}` +
                  `?type=` +
                  `${cash_retention_type ? cash_retention_type : ''}` +
                  `&cash-retention-type=` +
                  `${cash_retention_type ? (cash_retention_type === 'Retention claim' ? 'RetentionClaim' : '') : ''}` +
                  `&beneficiary=` +
                  `${beneficiary_type ? beneficiary_type : ''}` +
                  `&payment-type=` +
                  `${payment_type ? payment_type : ''}` +
                  `&payment=` +
                  `${payment_id ? payment_id : ''}` +
                  `&ctype=` +
                  `${claim_type ? claim_type : ''}` +
                  `&from=log`;
              }
              break;
          }
        }
        break;
    }
    return paymentClaimLink;
  } catch (error) {
    throw error;
  }
}
