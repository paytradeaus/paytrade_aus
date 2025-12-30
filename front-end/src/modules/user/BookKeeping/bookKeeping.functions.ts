import { showErrorToast, showSuccessToast } from "@/components/Toaster";
import { ITransactions } from "./booKeeping.constants";
import { apolloClient } from "@/network/apolloClient";
import { ApiResponse } from "@/shared/constant/messages";
import { gql } from "@apollo/client";

export const FetchAllTransactions = async (
  data: any,
  setLoading?: Function
): Promise<
  { transactions_list: ITransactions[]; total_count: number } | any
> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query FetchAllTransactions($payload: FetchAllTransactionsInput!) {
          fetchAllTransactions(payload: $payload) {
            data {
              total_count
              transactions_list {
                bank_account_id
                description
                formatted_received_amount
                formatted_spent_amount
                id
                is_receivable
                matched_payment_claims {
                  payment_claim_id
                  payment_id
                }
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
      variables: {
        payload: data,
      },
      fetchPolicy: "no-cache",
    });
    if (
      response &&
      response?.data?.fetchAllTransactions?.status === ApiResponse.SUCCESS
    ) {
      return response?.data?.fetchAllTransactions?.data;
    }
    if (
      response &&
      response?.data?.fetchAllTransactions?.status === ApiResponse.ERROR
    ) {
      console.error(response && response?.data?.fetchAllTransactions?.message);
      return null;
    }
  } catch (error: any) {
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};

export const ExcludeTransactions = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.mutate({
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

    if (response?.data?.excludeTransactions?.status === ApiResponse.SUCCESS) {
      showSuccessToast(
        response?.data?.excludeTransactions?.message ||
          "Transactions excluded successfully."
      );
      return true;
    }
    if (response?.data?.excludeTransactions?.status === ApiResponse.ERROR) {
      showErrorToast(response?.data?.excludeTransactions?.message);
      return false;
    }
  } catch (error: any) {
    console.error("GraphQL Error:", error);
    return false;
  } finally {
    setLoading && setLoading(false);
  }
};
