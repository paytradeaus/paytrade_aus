import { ERROR, SUCCESS } from "@/app/message";
import { showErrorToast, showSuccessToast } from "@/components/Toaster";
import apolloClient from "@/network/apolloClient";
import { gql } from "@apollo/client";

export async function FetchPaymentsToMatchTransactions(
  postData: any
): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        query FetchPaymentsToMatchTransactions($transactionIds: [String!]!) {
          fetchPaymentsToMatchTransactions(transaction_ids: $transactionIds) {
            data {
              payments {
                amount
                cash_retention_type
                claim_details {
                  beneficiary_type
                  payments {
                    payment_id
                    payment_type
                  }
                }
                claim_type
                client_supplier_id
                client_supplier_name
                is_other_payment
                is_receivable
                payment_claim_id
                payment_date
                payment_from_account
                payment_from_account_name
                payment_id
                payment_to_account
                payment_to_account_name
                payment_type
                received_amount
                retention_account_name
                retention_account_number
                spent_amount
                status
                sub_payment_id
                sub_payment_type
              }
              transactions {
                bank_account_id
                description
                formatted_received_amount
                formatted_spent_amount
                id
                is_receivable
                matched_to
                matched_to_payment_id
                received_amount
                spent_amount
                status
                txn_date
              }
            }
            message
            status
          }
        }
      `,
      variables: postData,
    });

    if (response?.data?.fetchPaymentsToMatchTransactions?.status === SUCCESS) {
      return response?.data?.fetchPaymentsToMatchTransactions?.data;
    }
    if (response?.data?.fetchPaymentsToMatchTransactions?.status === ERROR) {
      console.error(response?.data?.fetchPaymentsToMatchTransactions?.message);
      showErrorToast(response?.data?.fetchPaymentsToMatchTransactions?.message);
      return {};
    }
  } catch (error: any) {
    return {};
  }
}

export const MatchTransactionsAPI = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation MatchTransactions(
          $paymentIds: [Float!]!
          $transactionIds: [String!]!
        ) {
          matchTransactions(
            payment_ids: $paymentIds
            transaction_ids: $transactionIds
          ) {
            data {
              payments {
                payment_id
                sub_payment_id
              }
              transactions {
                id
              }
              payment_Ids
            }
            message
            status
          }
        }
      `,
      variables: data,
    });

    if (response?.data?.matchTransactions?.status === SUCCESS) {
      showSuccessToast(
        response?.data?.matchTransactions?.message ||
          "Transactions matched successfully"
      );
      return {
        payment_Ids: response?.data?.matchTransactions?.data?.payment_Ids || [],
        status: true,
      };
    }
    if (response?.data?.matchTransactions?.status === ERROR) {
      showErrorToast(response?.data?.matchTransactions?.message);
      return {
        payment_Ids: [],
        status: false,
      };
    }
  } catch (error: any) {
    console.error("GraphQL Error:", error);
    return {
      payment_Ids: [],
      status: false,
    };
  } finally {
    setLoading && setLoading(false);
  }
};

export const unmatchTransactionsAPI = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation UnmatchTransactions(
          $confirm: Boolean
          $transactionId: String
        ) {
          unmatchTransactions(
            confirm: $confirm
            transaction_id: $transactionId
          ) {
            data {
              groupTxn
              payments {
                amount
                cash_retention_type
                claim_type
                client_supplier_id
                client_supplier_name
                is_other_payment
                is_receivable
                payment_claim_id
                payment_date
                payment_from_account
                payment_from_account_name
                payment_id
                payment_to_account
                payment_to_account_name
                payment_type
                received_amount
                retention_account_name
                retention_account_number
                spent_amount
                status
                sub_payment_id
                sub_payment_type
              }
              related_transactions {
                description
                id
                received_amount
                spent_amount
                txn_date
              }
              transactions {
                description
                id
                received_amount
                spent_amount
                txn_date
              }
            }
            message
            status
          }
        }
      `,
      variables: data,
    });
    if (response?.data?.unmatchTransactions?.status === SUCCESS) {
      showSuccessToast(response?.data?.unmatchTransactions?.message || "");
      return response?.data?.unmatchTransactions?.data;
    }
    if (response?.data?.unmatchTransactions?.status === ERROR) {
      showErrorToast(response?.data?.unmatchTransactions?.message);
      return false;
    }
  } catch (error: any) {
    console.error("GraphQL Error:", error);
    return false;
  } finally {
    setLoading && setLoading(false);
  }
};

export const BulkUnmatchTransactions = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation BulkUnmatchTransactions(
          $transactionIds: [String!]!
          $confirm: Boolean
        ) {
          bulkUnmatchTransactions(
            transaction_ids: $transactionIds
            confirm: $confirm
          ) {
            data {
              payments {
                payment_id
              }
              transactions {
                id
              }
              groupTxn
            }
            message
            status
          }
        }
      `,
      variables: data,
    });
    if (response?.data?.bulkUnmatchTransactions?.status === SUCCESS) {
      showSuccessToast(
        response?.data?.bulkUnmatchTransactions?.message ||
          "Transactions unmatched successfully."
      );
      return response?.data?.bulkUnmatchTransactions;
    }
    if (response?.data?.bulkUnmatchTransactions?.status === ERROR) {
      showErrorToast(response?.data?.bulkUnmatchTransactions?.message);
      return {};
    }
  } catch (error: any) {
    console.error("GraphQL Error:", error);
    return {};
  } finally {
    setLoading && setLoading(false);
  }
};

export interface ISubPayment {
  amount: number;
  id: string;
  payment_date: string;
  payment_from_account: number;
  payment_from_account_name: string;
  payment_id: number;
  payment_to_account: number;
  payment_to_account_bsb_number: string;
  payment_to_account_name: string;
  payment_to_account_number: string;
  status: string;
  sub_payment_id: number;
  sub_payment_type: string;
  payment_claim_id: number;
  project_name: string;
  contract_name: string;
  claim_amount: number;
  spent_amount?: number;
  received_amount?: number;
  payment_type?: string;
}
