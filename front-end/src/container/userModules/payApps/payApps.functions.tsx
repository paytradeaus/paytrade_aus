import { gql } from "@apollo/client";
import { toast } from "@/app/Toaster";
import { client } from "@/app/api/adminAPIs/adminAPIs";

export interface PaymentClaim {
  claim_amount: number;
  cash_retention_type: string | null;
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
  list_status: string | null;
}

export const fetchAllPaymentClaims = async (
  payload: any,
  setLoading?: Function
): Promise<{ payment_claims: PaymentClaim[]; total_count: number } | null> => {
  try {
    const response = await client.query({
      query: gql`
        query FetchAllPaymentClaims(
          $payload: FetchAllPaymentClaimsOfACompanyInput!
        ) {
          fetchAllPaymentClaims(payload: $payload) {
            data {
              payment_claims {
                beneficiary_type
                cash_retention_type
                claim_amount
                claim_type
                list_status
                client_supplier_id
                client_supplier_name
                contract_id
                contract_name
                due_date
                formatted_claim_amount
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
            message
            status
          }
        }
      `,
      variables: { payload },
      fetchPolicy: "no-cache",
    });

    if (response?.data?.fetchAllPaymentClaims?.status === "SUCCESS") {
      return response?.data?.fetchAllPaymentClaims?.data;
    }

    if (response?.data?.fetchAllPaymentClaims?.status === "ERROR") {
      return null;
    }

    return null;
  } catch (error: any) {
    toast.error(error.message || "Something went wrong in the API");
    console.error("GraphQL Error:", error);
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
    const response = await client.mutate({
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
    if (response?.data?.changeStatusOfAPaymentClaim?.status === "SUCCESS") {
      toast.success(response?.data?.changeStatusOfAPaymentClaim?.message);
      return true;
    }
    if (response?.data?.changeStatusOfAPaymentClaim?.status === "ERROR") {
      console.error(response?.data?.changeStatusOfAPaymentClaim?.message);
      return false;
    }
    return false;
  } catch (error: any) {
    toast.error(error.message || "Something went wrong in API");
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};
