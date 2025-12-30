import { apolloClient } from "@/network/apolloClient";
import { ApiResponse } from "@/shared/constant/messages";
import { gql } from "@apollo/client";
import { showErrorToast, showSuccessToast } from "@/components/Toaster";

export async function GetVariationListsForCompany(postData: any): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        query GetVariationListsForCompany(
          $getVariationListsInput: GetVariationListsInput!
        ) {
          getVariationListsForCompany(
            getVariationListsInput: $getVariationListsInput
          ) {
            data {
              total_count
              variation_list {
                attachment_id
                company_id
                contract_id
                contract_name
                id
                project_id
                project_name
                variation_amount
                variation_id
                variation_name
                variation_status
                created_on
                file_type
                file_path
                file_name
                file
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
      response?.data?.getVariationListsForCompany?.status ===
      ApiResponse.SUCCESS
    ) {
      return response?.data?.getVariationListsForCompany?.data;
    } else {
      return {};
    }
  } catch (error: any) {
    return {};
  }
}

export async function fetchContractList(postData: any): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        query GetContractLists($company_id: Float!, $project_id: Float) {
          getContractLists(company_id: $company_id, project_id: $project_id) {
            data {
              client_supplier_id
              client_supplier_role
              contract_date
              contract_id
              contract_name
              contract_status
              contract_type
              id
              initial_contract_sum
              payment_terms
              project_id
              retention_type
            }
            message
            status
          }
        }
      `,
      variables: postData,
      fetchPolicy: "no-cache",
    });

    if (response?.data?.getContractLists?.status === ApiResponse.SUCCESS) {
      return response?.data?.getContractLists?.data;
    }
    if (response?.data?.getContractLists?.status === ApiResponse.ERROR) {
      return {};
    }
  } catch (error: any) {
    return {};
  }
}

export async function fetchProjectList(postData: any): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        query GetProjectsLists($companyId: Float!) {
          getProjectsLists(company_id: $companyId) {
            data {
              id
              project_id
              project_name
              project_role
              project_status
              pta_eligibility
              rta_eligibility
            }
            message
            status
          }
        }
      `,
      variables: postData,
      fetchPolicy: "no-cache",
    });

    if (response?.data?.getProjectsLists?.status === ApiResponse.SUCCESS) {
      return response?.data?.getProjectsLists?.data;
    }
    if (response?.data?.getProjectsLists?.status === ApiResponse.ERROR) {
      console.error(response?.data?.getProjectsLists?.message);
      showErrorToast(response?.data?.getProjectsLists?.message);
      return {};
    }
  } catch (error: any) {
    return {};
  }
}

export async function addVariationsFormData(postData: any): Promise<any> {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation InsertVariationDetails(
          $createVariationInput: CreateVariationInput!
        ) {
          insertVariationDetails(createVariationInput: $createVariationInput) {
            data {
              company_id
              id
              project_id
              variation_id
              variation_name
              variation_status
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
      response?.data?.insertVariationDetails?.status === ApiResponse.SUCCESS
    ) {
      showSuccessToast(response?.data?.insertVariationDetails?.message);
      return {
        data: response?.data?.insertVariationDetails?.data,
        status: true,
      };
    } else {
      showErrorToast(response?.data?.insertVariationDetails?.message);
      return false;
    }
  } catch (error: any) {
    return false;
  }
}

export async function fetchVariationsListById(postData: any): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        query ViewVariationDetailsById($id: String!) {
          viewVariationDetailsById(id: $id) {
            data {
              attachment_id
              company_id
              contract_id
              contract_name
              id
              project_id
              project_name
              variation_amount
              variation_id
              variation_name
              variation_status
              file
              file_name
              file_path
              file_type
              created_on
              is_archived
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
      response?.data?.viewVariationDetailsById?.status === ApiResponse.SUCCESS
    ) {
      return response?.data?.viewVariationDetailsById?.data;
    } else {
      showErrorToast(response?.data?.viewVariationDetailsById?.message);
      return {};
    }
  } catch (error: any) {
    return {};
  }
}

export async function updateVariationsFormData(postData: any): Promise<any> {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation EditVariationDetailsById(
          $updateVariationInput: UpdateVariationInput!
        ) {
          editVariationDetailsById(
            updateVariationInput: $updateVariationInput
          ) {
            data {
              attachment_id
              company_id
              contract_id
              contract_name
              id
              project_id
              project_name
              variation_amount
              variation_id
              variation_name
              variation_status
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
      response?.data?.editVariationDetailsById?.status === ApiResponse.SUCCESS
    ) {
      return {
        status: true,
        data: response?.data?.editVariationDetailsById?.data,
        message: response?.data?.editVariationDetailsById?.message,
      };
    }
    if (
      response?.data?.editVariationDetailsById?.status === ApiResponse.ERROR
    ) {
      showErrorToast(response?.data?.editVariationDetailsById?.message);
      return false;
    }
  } catch (error: any) {
    return false;
  }
}

export async function deleteVariationsById(postData: any): Promise<any> {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation UpdateVariationStatusById($id: String!, $status: String!) {
          updateVariationStatusById(id: $id, status: $status) {
            data {
              attachment_id
              company_id
              contract_id
              contract_name
              id
              project_id
              project_name
              variation_amount
              variation_id
              variation_name
              variation_status
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
      response?.data?.updateVariationStatusById?.status === ApiResponse.SUCCESS
    ) {
      showSuccessToast(response?.data?.updateVariationStatusById?.message);
      return true;
    }
    if (
      response?.data?.updateVariationStatusById?.status === ApiResponse.ERROR
    ) {
      showErrorToast(response?.data?.updateVariationStatusById?.message);
      return false;
    }
  } catch (error: any) {
    return false;
  }
}
