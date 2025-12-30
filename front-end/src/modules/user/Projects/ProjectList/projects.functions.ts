import { apolloClient } from "@/network/apolloClient";
import { ApiResponse } from "@/shared/constant/messages";
import { gql } from "@apollo/client";
import {
  showErrorToast,
  showSuccessToast,
  showWarningToast,
} from "@/components/Toaster";
import { IProjectListDetails } from "./projects.types";

export const getProjectListsForCompany = async (
  data: any,
  setLoading?: Function
): Promise<
  { total_count: number; project_list: IProjectListDetails[] } | any
> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query GetProjectListsForCompany(
          $getProjectListsInput: GetProjectListsInput!
        ) {
          getProjectListsForCompany(
            getProjectListsInput: $getProjectListsInput
          ) {
            data {
              project_list {
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
              total_count
            }
            message
            status
          }
        }
      `,
      variables: {
        getProjectListsInput: {
          company_id: data?.company_id,
          page_number: data?.page_number,
          page_size: data?.page_size,
          project_status: data?.project_status,
          project_name_or_id: data?.project_name_or_id,
          project_role: data?.project_role,
          date_filter: data?.dateFilter || null,
          start_date: data?.startDate || null,
          end_date: data?.endDate || null,
          sorting_field: data?.sorting_field || "",
          sorting_order: data?.sorting_order || "",
        },
      },
      fetchPolicy: "no-cache",
    });
    if (
      response?.data?.getProjectListsForCompany?.status === ApiResponse.SUCCESS
    ) {
      return response?.data?.getProjectListsForCompany?.data;
    }
    if (
      response?.data?.getProjectListsForCompany?.status === ApiResponse.ERROR
    ) {
      return null;
    }
  } catch (error: any) {
    showErrorToast(error.message || "Something went wrong in the API");
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};
export interface CreateProjectInput {
  country: any;
  head_contract_sum: any;
  latitude: any;
  longitude: any;
  number_of_units: any;
  place_id: any;
  project_date: any;
  project_description: any;
  project_name: any;
  project_role: any;
  project_status: any;
  pta_eligibility: any;
  region: any;
  retention_type: any;
  rta_eligibility: any;
  site_address: any;
  company_id: any;
}

export const insertProjectDetails = async (
  data: CreateProjectInput,
  setLoading?: Function
): Promise<
  | {
      company_id: string;
      id: string;
      project_id: string;
      project_name: string;
      project_status: string;
    }
  | any
> => {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation InsertProjectDetails(
          $createProjectInput: CreateProjectInput!
        ) {
          insertProjectDetails(createProjectInput: $createProjectInput) {
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
      variables: {
        createProjectInput: {
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
    });
    if (response?.data?.insertProjectDetails?.status === "SUCCESS") {
      return response?.data?.insertProjectDetails?.data;
    }
    if (response?.data?.insertProjectDetails?.status === "ERROR") {
      showErrorToast(response?.data?.insertProjectDetails?.message);
      return false;
    }
    if (response?.data?.insertProjectDetails?.status === "WARNING") {
      showWarningToast(response?.data?.insertProjectDetails?.message);
      return false;
    }
  } catch (error: any) {
    showErrorToast(error.message || "Something went wrong in the API");
    console.error("GraphQL Error:", error);
    return false;
  } finally {
    setLoading && setLoading(false);
  }
};

export const createProjectInPaytradeFromXeroData = async (
  data: any,
  setLoading?: Function
): Promise<
  | {
      company_id: string;
      id: string;
      project_id: string;
      project_name: string;
      project_status: string;
    }
  | any
> => {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation CreateProjectInPaytrade(
          $companyId: Float!
          $projectId: String!
          $payload: CreateProjectInput
          $syncId: String
        ) {
          createProjectInPaytrade(
            company_id: $companyId
            project_id: $projectId
            payload: $payload
            sync_id: $syncId
          ) {
            message
            status
            data {
              project_id
            }
          }
        }
      `,
      variables: {
        companyId: data.company_id,
        projectId: data?.project_id,
        syncId: data?.syncId,
        payload: {
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
    });
    if (response?.data?.createProjectInPaytrade?.status === "SUCCESS") {
      return response?.data?.createProjectInPaytrade?.data;
    }
    if (response?.data?.createProjectInPaytrade?.status === "ERROR") {
      showErrorToast(response?.data?.createProjectInPaytrade?.message);
      return false;
    }
    if (response?.data?.createProjectInPaytrade?.status === "WARNING") {
      showWarningToast(response?.data?.createProjectInPaytrade?.message);
      return false;
    }
  } catch (error: any) {
    showErrorToast(error.message || "Something went wrong in the API");
    console.error("GraphQL Error:", error);
    return false;
  } finally {
    setLoading && setLoading(false);
  }
};
export interface UpdateProjectStatusInput {
  id: string;
  status: string;
}

export const updateProjectStatusById = async (
  data: UpdateProjectStatusInput,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation UpdateProjectStatusById($id: String!, $status: String!) {
          updateProjectStatusById(id: $id, status: $status) {
            data {
              company_id
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
        id: data.id,
        status: data.status,
      },
      fetchPolicy: "no-cache",
    });
    if (response?.data?.updateProjectStatusById?.status === "SUCCESS") {
      showSuccessToast(response?.data?.updateProjectStatusById?.message);
      return true;
    }
    if (response?.data?.updateProjectStatusById?.status === "ERROR") {
      showErrorToast(response?.data?.updateProjectStatusById?.message);
      console.error(response?.data?.updateProjectStatusById?.message);
      return false;
    }
    return false;
  } catch (error: any) {
    showErrorToast(error.message || "Something went wrong in API");
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};
