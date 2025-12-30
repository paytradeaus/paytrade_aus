import { gql } from "@apollo/client";
import { toast } from "@/app/Toaster";
import { client } from "@/app/api/adminAPIs/adminAPIs";
import { SOMETHING_WENT_WRONG } from "@/common/constants/messages";

export interface ProjectType {
  company_id: string;
  country: string;
  head_contract_sum: string;
  id: string;
  latitude: string;
  longitude: string;
  number_of_units: string;
  place_id: string;
  project_date: string;
  project_description: string;
  project_id: string;
  project_name: string;
  project_role: string;
  project_status: string;
  pta_eligibility: string;
  region: string;
  retention_type: string;
  rta_eligibility: string;
  site_address: string;
}

export const getProjectListsForCompany = async (
  data: any,
  setLoading?: Function
): Promise<{ total_count: number; project_list: ProjectType[] } | any> => {
  try {
    const response = await client.query({
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
          project_role: data?.project_role?.value || null,
          date_filter: data?.dateFilter || null,
          start_date: data?.startDate || null,
          end_date: data?.endDate || null,
        },
      },
      fetchPolicy: "no-cache",
    });
    if (response?.data?.getProjectListsForCompany?.status === "SUCCESS") {
      return response?.data?.getProjectListsForCompany?.data;
    }
    if (response?.data?.getProjectListsForCompany?.status === "ERROR") {
      return null;
    }
  } catch (error: any) {
    toast.error(error.message || "Something went wrong in the API");
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
    const response = await client.mutate({
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
      return true;
    }
    if (response?.data?.insertProjectDetails?.status === "ERROR") {
      console.error(response?.data?.insertProjectDetails?.message);
      return false;
    }
  } catch (error: any) {
    toast.error(error.message || "Something went wrong in the API");
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
    const response = await client.mutate({
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
      toast.success(response?.data?.updateProjectStatusById?.message);
      return true;
    }
    if (response?.data?.updateProjectStatusById?.status === "ERROR") {
      toast.error(response?.data?.updateProjectStatusById?.message);
      console.error(response?.data?.updateProjectStatusById?.message);
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
