import { client } from "@/app/api/apolloClientServices";
import { toast } from "@/app/Toaster";
import { ERROR, SUCCESS } from "@/common/constants/messages";
import { gql } from "@apollo/client";

export async function fetchCompliancesList(postData: any): Promise<any> {
  try {
    const response = await client.query({
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

    if (response?.data?.fetchAllCompliances?.status === SUCCESS) {
      return response?.data?.fetchAllCompliances?.data;
    }
    if (response?.data?.fetchAllCompliances?.status === ERROR) {
      toast.error(response?.data?.fetchAllCompliances?.message);
      return {};
    }
  } catch (error: any) {
    return false;
  }
}

export async function fetchComplianceTimeLine(postData: any): Promise<any> {
  try {
    const response = await client.query({
      query: gql`
        query FetchComplianceResultsOfAProject(
          $payload: FetchComplianceResultsOfAProjectInput!
        ) {
          fetchComplianceResultsOfAProject(payload: $payload) {
            data {
              check_colour_code
              check_number
              results {
                action_button_type
                check_name
                check_number
                check_status
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

    if (response?.data?.fetchComplianceResultsOfAProject?.status === SUCCESS) {
      return response?.data?.fetchComplianceResultsOfAProject?.data;
    }
    if (response?.data?.fetchComplianceResultsOfAProject?.status === ERROR) {
      toast.error(response?.data?.fetchComplianceResultsOfAProject?.message);
      return false;
    }
  } catch (error: any) {
    return false;
  }
}

export async function fetchComplianceOverview(postData: any): Promise<any> {
  try {
    const response = await client.query({
      query: gql`
        query FetchComplianceStatusesOfAProject(
          $payload: FetchComplianceStatusesOfAProjectInput!
        ) {
          fetchComplianceStatusesOfAProject(payload: $payload) {
            data {
              project_name
              pta_compliance
              rta_compliance
            }
            message
            status
          }
        }
      `,
      variables: postData,
      fetchPolicy: "no-cache",
    });

    if (response?.data?.fetchComplianceStatusesOfAProject?.status === SUCCESS) {
      return response?.data?.fetchComplianceStatusesOfAProject?.data;
    }
    if (response?.data?.fetchComplianceStatusesOfAProject?.status === ERROR) {
      return false;
    }
  } catch (error: any) {
    return false;
  }
}
