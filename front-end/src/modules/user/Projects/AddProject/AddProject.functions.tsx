import { ERROR, SUCCESS } from "@/app/message";
import { showErrorToast, showSuccessToast } from "@/components/Toaster";
import apolloClient from "@/network/apolloClient";
import { gql } from "@apollo/client";

export interface updateProjectInput {
  id: any;
  country?: any;
  head_contract_sum: any;
  latitude?: any;
  longitude?: any;
  number_of_units: any;
  place_id?: any;
  project_date?: any;
  project_description?: any;
  project_name?: any;
  project_role?: any;
  project_status: any;
  pta_eligibility: any;
  region?: any;
  retention_type: any;
  rta_eligibility: any;
  site_address?: any;
  company_id?: any;
}

export const editProjectDetailsById = async (
  data: updateProjectInput,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation EditProjectDetailsById(
          $updateProjectInput: UpdateProjectInput!
        ) {
          editProjectDetailsById(updateProjectInput: $updateProjectInput) {
            data {
              company_id
              contract_count
              country
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
              pta_eligibility
              region
              retention_type
              rta_eligibility
              site_address
            }
            message
            status
          }
        }
      `,
      variables: {
        updateProjectInput: {
          id: data.id,
          country: data.country,
          head_contract_sum: data.head_contract_sum,
          latitude: data.latitude,
          longitude: data.longitude,
          number_of_units: data.number_of_units,
          place_id: data.place_id,
          project_date: data.project_date,
          project_description: data.project_description,
          project_name: data.project_name,
          project_role: data.project_role,
          project_status: data.project_status,
          pta_eligibility: data.pta_eligibility,
          region: data.region,
          retention_type: data.retention_type,
          rta_eligibility: data.rta_eligibility,
          site_address: data.site_address,
          company_id: data.company_id,
        },
      },
      fetchPolicy: "no-cache",
    });
    if (response?.data?.editProjectDetailsById?.status === "SUCCESS") {
      showSuccessToast(response?.data?.editProjectDetailsById?.message);
      return true;
    }
    if (response?.data?.editProjectDetailsById?.status === "ERROR") {
      showErrorToast(response?.data?.editProjectDetailsById?.message);
      console.error(response?.data);
      return false;
    }
    return false;
  } catch (error: any) {
    showErrorToast(error.message || "Something went wrong in API");
    console.error("GraphQL Error:", error);
    return false;
  } finally {
    setLoading && setLoading(false);
  }
};

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

export async function CheckExistenceForProject(postData: any): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        query CheckExistenceForProject(
          $companyId: Float!
          $projectName: String
        ) {
          checkExistenceForProject(
            company_id: $companyId
            project_name: $projectName
          ) {
            data {
              company_id
              id
              project_id
              project_name
              project_status
            }
            message
            status
          }
        }
      `,
      variables: postData,
      fetchPolicy: "no-cache",
    });

    if (response?.data?.checkExistenceForProject?.status === SUCCESS) {
      return response?.data?.checkExistenceForProject?.data;
    }
    if (response?.data?.checkExistenceForProject?.status === ERROR) {
      showErrorToast(response?.data?.checkExistenceForProject?.message);
      return {};
    }
  } catch (error: any) {
    return {};
  }
}
