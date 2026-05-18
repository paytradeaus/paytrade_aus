import { apolloClient } from "@/network/apolloClient";
import { ApiResponse } from "@/shared/constant/messages";
import { gql } from "@apollo/client";
import { showErrorToast, showSuccessToast } from "@/components/Toaster";

export interface PaymentClaim {
  claim_amount: number;
  list_status: string | null;
  cash_retention_type: string | null;
  claim_reference: string | null;
  client_supplier_name: string | null;
  contract_name: string | null;
  project_name: string | null;
  claim_type: string | null;
  client_supplier_id: string | null;
  contract_id: string | null;
  due_date: string | null; // You might want to use a specific date type here
  payment_claim_id: string | null;
  project_id: string | null;
  status: string | null;
}

export const fetchAllPaymentClaims = async (
  payload: any,
  setLoading?: Function
): Promise<{ payment_claims: PaymentClaim[]; total_count: number } | null> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query FetchAllPaymentClaims(
          $payload: FetchAllPaymentClaimsOfACompanyInput!
        ) {
          fetchAllPaymentClaims(payload: $payload) {
            message
            status
            data {
              payment_claims {
                beneficiary_type
                cash_retention_type
                claim_amount
                claim_list_buttons
                claim_reference
                claim_type
                claim_date
                client_supplier_id
                client_supplier_name
                contract_id
                contract_name
                due_date
                formatted_claim_amount
                list_status
                notices {
                  notice_id
                  notice_type
                  status
                }
                payment_claim_id
                payments {
                  payment_id
                  payment_type
                }
                project_id
                project_name
                status
              }
              total_count
            }
          }
        }
      `,
      variables: { payload },
      fetchPolicy: "no-cache",
    });

    if (response?.data?.fetchAllPaymentClaims?.status === ApiResponse.SUCCESS) {
      return response?.data?.fetchAllPaymentClaims?.data;
    }

    if (response?.data?.fetchAllPaymentClaims?.status === ApiResponse.ERROR) {
      return null;
    }

    return null;
  } catch (error: any) {
    showErrorToast(error.message || ApiResponse.SOMETHING_WENT_WRONG);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};

type ChangeStatusOfAPaymentClaimInput = {
  payment_claim_id: string;
  status: string;
};

export const changeStatusOfAPaymentClaim = async (
  payload: ChangeStatusOfAPaymentClaimInput,
  setLoading?: Function
): Promise<boolean | null> => {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation ChangeStatusOfAPaymentClaim(
          $payload: ChangeStatusOfAPaymentClaimInput!
        ) {
          changeStatusOfAPaymentClaim(payload: $payload) {
            data
            message
            status
          }
        }
      `,
      variables: {
        payload,
      },
      fetchPolicy: "no-cache",
    });
    if (
      response?.data?.changeStatusOfAPaymentClaim?.status ===
      ApiResponse.SUCCESS
    ) {
      showSuccessToast(response?.data?.changeStatusOfAPaymentClaim?.message);
      return true;
    }
    if (
      response?.data?.changeStatusOfAPaymentClaim?.status === ApiResponse.ERROR
    ) {
      return false;
    }
    return false;
  } catch (error: any) {
    showErrorToast(error.message || ApiResponse.SOMETHING_WENT_WRONG);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};
