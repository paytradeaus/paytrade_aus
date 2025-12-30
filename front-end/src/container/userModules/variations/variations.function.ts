import { client } from "@/app/api/apolloClientServices";
import { toast } from "@/app/Toaster";
import { ERROR, SUCCESS } from "@/common/constants/messages";
import { gql } from "@apollo/client";

export async function fetchProjectList(postData: any): Promise<any> {
  try {
    const response = await client.query({
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

    if (response?.data?.getProjectsLists?.status === SUCCESS) {
      return response?.data?.getProjectsLists?.data;
    }
    if (response?.data?.getProjectsLists?.status === ERROR) {
      console.error(response?.data?.getProjectsLists?.message);
      toast.error(response?.data?.getProjectsLists?.message);
      return {};
    }
  } catch (error: any) {
    return {};
  }
}

export async function fetchContractList(postData: any): Promise<any> {
  try {
    const response = await client.query({
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

    if (response?.data?.getContractLists?.status === SUCCESS) {
      return response?.data?.getContractLists?.data;
    }
    if (response?.data?.getContractLists?.status === ERROR) {
      return {};
    }
  } catch (error: any) {
    return {};
  }
}

export async function addVariationsFormData(postData: any): Promise<any> {
  try {
    const response = await client.mutate({
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

    if (response?.data?.insertVariationDetails?.status === SUCCESS) {
      toast.success(response?.data?.insertVariationDetails?.message);
      return {
        data: response?.data?.insertVariationDetails?.data,
        status: true,
      };
    } else {
      toast.error(response?.data?.insertVariationDetails?.message);
      return false;
    }
  } catch (error: any) {
    return false;
  }
}

export async function fetchVariationsList(postData: any): Promise<any> {
  try {
    const response = await client.query({
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

    if (response?.data?.getVariationListsForCompany?.status === SUCCESS) {
      return response?.data?.getVariationListsForCompany?.data;
    } else {
      return {};
    }
  } catch (error: any) {
    return {};
  }
}

export async function fetchVariationsListById(postData: any): Promise<any> {
  try {
    const response = await client.query({
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

    if (response?.data?.viewVariationDetailsById?.status === SUCCESS) {
      return response?.data?.viewVariationDetailsById?.data;
    } else {
      toast.error(response?.data?.viewVariationDetailsById?.message);
      return {};
    }
  } catch (error: any) {
    return {};
  }
}

export async function updateVariationsFormData(postData: any): Promise<any> {
  try {
    const response = await client.mutate({
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

    if (response?.data?.editVariationDetailsById?.status === SUCCESS) {
      return {
        status: true,
        data: response?.data?.editVariationDetailsById?.data,
        message: response?.data?.editVariationDetailsById?.message,
      };
    }
    if (response?.data?.editVariationDetailsById?.status === ERROR) {
      toast.error(response?.data?.editVariationDetailsById?.message);
      return false;
    }
  } catch (error: any) {
    return false;
  }
}

export async function deleteVariationsById(postData: any): Promise<any> {
  try {
    const response = await client.mutate({
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

    if (response?.data?.updateVariationStatusById?.status === SUCCESS) {
      toast.success(response?.data?.updateVariationStatusById?.message);
      return true;
    }
    if (response?.data?.updateVariationStatusById?.status === ERROR) {
      toast.error(response?.data?.updateVariationStatusById?.message);
      return false;
    }
  } catch (error: any) {
    return false;
  }
}

export async function deleteAttachment(postData: any): Promise<any> {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation DeleteFileByIdAndType(
          $attachmentId: String!
          $attachmentType: String!
          $id: String!
        ) {
          deleteFileByIdAndType(
            attachmentId: $attachmentId
            attachmentType: $attachmentType
            id: $id
          ) {
            message
            status
          }
        }
      `,
      variables: postData,
      fetchPolicy: "no-cache",
    });

    if (response?.data?.deleteFileByIdAndType?.status === SUCCESS) {
      return true;
    }
    if (response?.data?.deleteFileByIdAndType?.status === ERROR) {
      return false;
    }
  } catch (error: any) {
    return false;
  }
}
