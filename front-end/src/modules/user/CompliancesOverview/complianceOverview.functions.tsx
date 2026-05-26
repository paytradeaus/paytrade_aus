import { apolloClient } from "@/network/apolloClient";
import { ApiResponse } from "@/shared/constant/messages";
import { gql } from "@apollo/client";
import { showErrorToast, showSuccessToast } from "@/components/Toaster";

export async function GetComplianceResultsOfAProject(
  postData: any
): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        query GetComplianceResultsOfAProject(
          $payload: FetchComplianceResultsOfAProjectInput!
        ) {
          getComplianceResultsOfAProject(payload: $payload) {
            data {
              check_colour_code
              check_number
              display_check_number
              mails
              results {
                action_button_type
                check_name
                check_number
                check_status
                notify
                content
                display_message
                display_message_colour
                reference_id
                rule_number
              }
            }
            message
            status
          }
        }
      `,
      variables: postData,
      fetchPolicy: "no-cache",
    });

    if (
      response?.data?.getComplianceResultsOfAProject?.status ===
      ApiResponse.SUCCESS
    ) {
      return response?.data?.getComplianceResultsOfAProject?.data;
    }
    if (
      response?.data?.getComplianceResultsOfAProject?.status ===
      ApiResponse.ERROR
    ) {
      showErrorToast(response?.data?.getComplianceResultsOfAProject?.message);
      return false;
    }
  } catch {
    return false;
  }
}

export async function fetchComplianceOverview(postData: any): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        query FetchComplianceStatusesOfAProject(
          $payload: FetchComplianceStatusesOfAProjectInput!
        ) {
          fetchComplianceStatusesOfAProject(payload: $payload) {
            data {
              project_name
              pta_compliance
              rta_compliance
              rta_compliance_silenced
              pta_compliance_silenced
            }
            message
            status
          }
        }
      `,
      variables: postData,
      fetchPolicy: "no-cache",
    });

    if (
      response?.data?.fetchComplianceStatusesOfAProject?.status ===
      ApiResponse.SUCCESS
    ) {
      return response?.data?.fetchComplianceStatusesOfAProject?.data;
    }
    if (
      response?.data?.fetchComplianceStatusesOfAProject?.status ===
      ApiResponse.ERROR
    ) {
      return false;
    }
  } catch (error: any) {
    return false;
  }
}

// Task #297 — "Refresh now" mutation that asks the backend to rebuild the
// persisted compliance cache for one project across PTA and RTA. The
// Compliance overview page button calls this and then re-fetches the
// list so the user sees the fresh evaluation immediately.
export async function forceRefreshProjectCompliance(
  projectId: number
): Promise<boolean> {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation ForceRefreshProjectCompliance($projectId: Float!) {
          forceRefreshProjectCompliance(projectId: $projectId) {
            message
            status
          }
        }
      `,
      variables: { projectId },
      fetchPolicy: "no-cache",
    });

    const status = response?.data?.forceRefreshProjectCompliance?.status;
    const message = response?.data?.forceRefreshProjectCompliance?.message;

    if (status === ApiResponse.SUCCESS) {
      showSuccessToast(message || "Compliance refreshed");
      return true;
    }
    if (status === ApiResponse.ERROR) {
      showErrorToast(message || "Could not refresh compliance");
      return false;
    }
    return false;
  } catch {
    showErrorToast("Could not refresh compliance");
    return false;
  }
}

export async function silenceComplianceMail(postData: any): Promise<any> {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation SilenceComplianceMail(
          $payload: SilenceComplianceOfAProjectInput!
        ) {
          silenceComplianceMail(payload: $payload) {
            message
            status
          }
        }
      `,
      variables: { payload: postData },
      fetchPolicy: "no-cache",
    });

    if (response?.data?.silenceComplianceMail?.status === ApiResponse.SUCCESS) {
      showSuccessToast(response?.data?.silenceComplianceMail?.message);
      return response?.data?.silenceComplianceMail?.message;
    }

    if (response?.data?.silenceComplianceMail?.status === ApiResponse.ERROR) {
      showErrorToast(response?.data?.silenceComplianceMail?.message);
      return false;
    }
  } catch (error: any) {
    return false;
  }
}
