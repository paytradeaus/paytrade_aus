import { apolloClient } from "@/network/apolloClient";
import { ApiResponse } from "@/shared/constant/messages";
import { gql } from "@apollo/client";
import { showErrorToast, showSuccessToast } from "@/components/Toaster";

export interface RetentionData {
  beneficiary_name: string;
  due_date: string;
  beneficiary_type: string;
  client_supplier_id: number;
  contract_id: string;
  contract_name: string;
  payment_id: string;
  payment_claim_id: string;
  payment_type: string;
  project_id: string;
  project_name: string;
  retained_amount: number;
  retention_list_id: string;
  retention_account_id: number;
  retention_trust_account_name: string;
  status: string;
  sub_payment_id: string;
  cash_retention_type: string;
  claim_type: string;
}

export const fetchAllRetentionInPaymentsList = async (
  data: any,
  setLoading?: Function
): Promise<{ retentions: RetentionData[]; total_count: number } | any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query FetchAllRetentionInPaymentsList(
          $payload: FetchAllRetentionInPaymentsListInput!
        ) {
          fetchAllRetentionInPaymentsList(payload: $payload) {
            data {
              data {
                beneficiary_name
                beneficiary_type
                cash_retention_type
                claim_created_on
                claim_type
                client_supplier_id
                contract_id
                contract_name
                due_date
                payment_claim_id
                payment_id
                payment_type
                project_id
                project_name
                received_date
                retained_amount
                retention_account_id
                retention_list_id
                retention_trust_account_name
                sent_date
                status
                sub_payment_id
              }
              total_count
            }
            message
            status
          }
        }
      `,
      variables: { payload: data },
      fetchPolicy: "no-cache",
    });

    if (
      response &&
      response.data.fetchAllRetentionInPaymentsList.status ===
        ApiResponse.SUCCESS
    ) {
      return response.data.fetchAllRetentionInPaymentsList.data;
    }
    if (
      response &&
      response.data.fetchAllRetentionInPaymentsList.status === ApiResponse.ERROR
    ) {
      return null;
    }
  } catch (error: any) {
    console.error(
      "Error fetching retention in payments list:",
      error.message || "Something went wrong"
    );
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};

export const fetchRetentionsSummary = async (
  data: any,
  setLoading?: Function
): Promise<{ retentions: RetentionData[]; total_count: number } | any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query FetchRetentionSummary($payload: FetchRetentionSummaryInput!) {
          fetchRetentionSummary(payload: $payload) {
            data {
              retention_summary {
                amount
                beneficiary_name
                event_id
                payment_amount
                retained_account_name
                retained_on
                retention_id
                retention_summary_id
                retention_type
                status
                sub_payment_id
              }
              total_count
            }
            message
            status
          }
        }
      `,
      variables: data,
      fetchPolicy: "no-cache",
    });
    if (
      response &&
      response.data.fetchRetentionSummary.status === ApiResponse.SUCCESS
    ) {
      return response.data.fetchRetentionSummary.data;
    }
    if (
      response &&
      response.data.fetchRetentionSummary.status === ApiResponse.ERROR
    ) {
      showErrorToast(response.data.fetchRetentionSummary.message);
      return null;
    }
  } catch (error: any) {
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};

export const checkCompletionStatusOfAssociatedRetentionClaims = async (
  data: any,
  setLoading?: Function
): Promise<{ is_previous_claims_completed: boolean } | any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query CheckCompletionStatusOfAssociatedRetentionClaims(
          $payload: CheckCompletionStatusOfAssociatedRetentionClaimsInput!
        ) {
          checkCompletionStatusOfAssociatedRetentionClaims(payload: $payload) {
            data {
              is_previous_claims_completed
            }
            message
            status
          }
        }
      `,
      variables: { payload: data },
      fetchPolicy: "no-cache",
    });
    if (
      response &&
      response.data.checkCompletionStatusOfAssociatedRetentionClaims.status ===
        ApiResponse.SUCCESS
    ) {
      return response.data.checkCompletionStatusOfAssociatedRetentionClaims
        .data;
    }
    if (
      response &&
      response.data.checkCompletionStatusOfAssociatedRetentionClaims.status ===
        ApiResponse.ERROR
    ) {
      showErrorToast(
        response.data.checkCompletionStatusOfAssociatedRetentionClaims.message
      );
      return null;
    }
  } catch (error: any) {
    console.error(
      "Error in checkCompletionStatusOfAssociatedRetentionClaims:",
      error
    );
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};
