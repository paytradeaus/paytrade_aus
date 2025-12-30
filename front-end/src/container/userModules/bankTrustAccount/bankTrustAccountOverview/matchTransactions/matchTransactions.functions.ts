import { client } from "@/app/api/apolloClientServices";
import { toast } from "@/app/Toaster";
import { ERROR, SUCCESS } from "@/common/constants/messages";
import { gql } from "@apollo/client";

export async function FetchPaymentsToMatchTransactions(
  postData: any
): Promise<any> {
  try {
    const response = await client.query({
      query: gql`
        query FetchPaymentsToMatchTransactions($transactionIds: [String!]!) {
          fetchPaymentsToMatchTransactions(transaction_ids: $transactionIds) {
            data {
              payments {
                amount
                client_supplier_id
                client_supplier_name
                payment_date
                payment_from_account
                payment_from_account_name
                payment_id
                payment_to_account
                payment_to_account_name
                retention_account_name
                retention_account_number
                status
                sub_payment_id
                sub_payment_type
                claim_type
                spent_amount
                received_amount
                cash_retention_type
                is_receivable
                is_other_payment
                payment_type
              }
              transactions {
                description
                id
                matched_to
                received_amount
                spent_amount
                status
                txn_date
                is_receivable
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
      toast.error(response?.data?.fetchPaymentsToMatchTransactions?.message);
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
    const response = await client.mutate({
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
      toast.success(
        response?.data?.matchTransactions?.message ||
          "Transactions matched successfully"
      );
      return {
        payment_Ids: response?.data?.matchTransactions?.data?.payment_Ids || [],
        status: true,
      };
    }
    if (response?.data?.matchTransactions?.status === ERROR) {
      toast.error(response?.data?.matchTransactions?.message);
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
    const response = await client.mutate({
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
      toast.success(response?.data?.unmatchTransactions?.message || "");
      return response?.data?.unmatchTransactions?.data;
    }
    if (response?.data?.unmatchTransactions?.status === ERROR) {
      toast.error(response?.data?.unmatchTransactions?.message);
      return false;
    }
  } catch (error: any) {
    console.error("GraphQL Error:", error);
    return false;
  } finally {
    setLoading && setLoading(false);
  }
};

export async function ListAllSubPayments(postData: any): Promise<any> {
  try {
    const response = await client.query({
      query: gql`
        query ListAllSubPayments($payload: ListSubPaymentsInput!) {
          listAllSubPayments(payload: $payload) {
            data {
              payments {
                amount
                id
                payment_date
                payment_from_account
                payment_from_account_name
                payment_id
                payment_to_account
                payment_to_account_bsb_number
                payment_to_account_name
                payment_to_account_number
                status
                sub_payment_id
                sub_payment_type
                payment_claim_id
                project_name
                contract_name
                claim_amount
                spent_amount
                received_amount
                claim_type
                payment_type
              }
              total_count
            }
            message
            status
          }
        }
      `,
      variables: {
        payload: postData,
      },
    });

    if (response?.data?.listAllSubPayments?.status === SUCCESS) {
      return response?.data?.listAllSubPayments?.data;
    }
    if (response?.data?.listAllSubPayments?.status === ERROR) {
      console.error(response?.data?.listAllSubPayments?.message);
      toast.error(response?.data?.listAllSubPayments?.message);
      return {};
    }
  } catch (error: any) {
    return {};
  }
}

export const ExcludeTransactions = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation ExcludeTransactions($payload: ExcludeTransactionInput!) {
          excludeTransactions(payload: $payload) {
            message
            status
          }
        }
      `,
      variables: data,
    });

    if (response?.data?.excludeTransactions?.status === SUCCESS) {
      toast.success(
        response?.data?.excludeTransactions?.message ||
          "Transactions excluded successfully."
      );
      return true;
    }
    if (response?.data?.excludeTransactions?.status === ERROR) {
      toast.error(response?.data?.excludeTransactions?.message);
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
    const response = await client.mutate({
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
      toast.success(
        response?.data?.bulkUnmatchTransactions?.message ||
          "Transactions unmatched successfully."
      );
      return response?.data?.bulkUnmatchTransactions;
    }
    if (response?.data?.bulkUnmatchTransactions?.status === ERROR) {
      toast.error(response?.data?.bulkUnmatchTransactions?.message);
      return {};
    }
  } catch (error: any) {
    console.error("GraphQL Error:", error);
    return {};
  } finally {
    setLoading && setLoading(false);
  }
};
