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
