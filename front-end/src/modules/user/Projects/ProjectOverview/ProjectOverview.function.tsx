import { apolloClient } from "@/network/apolloClient";
import { ApiResponse } from "@/shared/constant/messages";
import { gql } from "@apollo/client";
import { showErrorToast, showSuccessToast } from "@/components/Toaster";

export const viewProjectDetails = async (data: {
  viewProjectDetailsId: string;
}): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query ViewProjectDetails($viewProjectDetailsId: String!) {
          viewProjectDetails(id: $viewProjectDetailsId) {
            data {
              company_id
              compliance
              contract_count
              country
              formatted_head_contract_sum
              head_contract_sum
              id
              latitude
              longitude
              number_of_units
              place_id
              project_date
              project_description
              project_id
              project_name
              project_role
              project_status
              pta_compliance
              pta_eligibility
              region
              retention_type
              rta_compliance
              rta_eligibility
              site_address
            }
            message
            status
          }
        }
      `,
      variables: data,

      fetchPolicy: "no-cache",
    });
    if (response?.data?.viewProjectDetails?.status === "SUCCESS") {
      return response?.data?.viewProjectDetails?.data;
    }
    if (response?.data?.viewProjectDetails?.status === "ERROR") {
      return null;
    }
    return null;
  } catch (error: any) {
    showErrorToast(error.message || "Something went wrong in API");
    return null;
  }
};
