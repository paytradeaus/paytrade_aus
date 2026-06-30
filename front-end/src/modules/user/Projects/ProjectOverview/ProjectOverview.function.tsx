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
              compliance_paused
              compliance_paused_reason
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

export const setProjectCompliancePaused = async (data: {
  projectId: number;
  paused: boolean;
  reason?: string;
}): Promise<boolean> => {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation SetProjectCompliancePaused(
          $projectId: Float!
          $paused: Boolean!
          $reason: String
        ) {
          setProjectCompliancePaused(
            projectId: $projectId
            paused: $paused
            reason: $reason
          ) {
            message
            status
          }
        }
      `,
      variables: data,
      fetchPolicy: "no-cache",
    });
    if (
      response?.data?.setProjectCompliancePaused?.status === "SUCCESS"
    ) {
      showSuccessToast(
        response?.data?.setProjectCompliancePaused?.message ||
          (data.paused
            ? "Compliance monitoring paused."
            : "Compliance monitoring resumed.")
      );
      return true;
    }
    showErrorToast(
      response?.data?.setProjectCompliancePaused?.message ||
        "Could not update compliance pause."
    );
    return false;
  } catch (error: any) {
    showErrorToast(error.message || "Something went wrong in API");
    return false;
  }
};
