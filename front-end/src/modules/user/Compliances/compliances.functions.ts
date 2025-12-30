import { apolloClient } from "@/network/apolloClient";
import { ApiResponse } from "@/shared/constant/messages";
import { gql } from "@apollo/client";
import { showErrorToast } from "@/components/Toaster";

export async function fetchCompliancesList(postData: any): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        query FetchAllCompliances($payload: FetchAllCompliancesInput!) {
          fetchAllCompliances(payload: $payload) {
            data {
              results {
                company_id
                company_name
                project_added_on_date
                project_id
                project_name
                pta_compliance
                role
                rta_compliance
                site_address
                status
              }
              total_count
            }
            message
            status
          }
        }
      `,
      variables: postData,
      fetchPolicy: "no-cache",
    });

    if (response?.data?.fetchAllCompliances?.status === ApiResponse.SUCCESS) {
      return response?.data?.fetchAllCompliances?.data;
    }
    if (response?.data?.fetchAllCompliances?.status === ApiResponse.ERROR) {
      showErrorToast(response?.data?.fetchAllCompliances?.message);
      return {};
    }
  } catch (error: any) {
    return false;
  }
}
