import { apolloClient } from "@/network/apolloClient";
import { ApiResponse } from "@/shared/constant/messages";
import { gql } from "@apollo/client";
import { client } from "@/app/api/adminApi/adminApi";

export async function postAddClientSuppliersFormData(
  postData: any
): Promise<any> {
  try {
    console.log(postData, "createClientSuppliersDetailInput payload");

    const response = await client.mutate({
      mutation: gql`
        mutation InsertClientSupplierDetails(
          $createClientSuppliersDetailInput: CreateClientSuppliersDetailInput!
        ) {
          insertClientSupplierDetails(
            createClientSuppliersDetailInput: $createClientSuppliersDetailInput
          ) {
            data {
              client_supplier_id
              client_supplier_name
              client_supplier_status
              company_id
              id
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
      response &&
      response?.data?.postAddClientSuppliersFormData?.status ===
        ApiResponse.SUCCESS
    ) {
      return response?.data?.postAddClientSuppliersFormData?.data;
    } else if (
      response &&
      response?.data?.postAddClientSuppliersFormData?.status ===
        ApiResponse.ERROR
    ) {
      return null;
    }
  } catch (error: any) {
    return null;
  }
}

export async function updateClientSuppliersById(postData: any): Promise<any> {
  try {
    console.log(postData, "updateClientSuppliersDetailInput payload");
    const response = await client.mutate({
      mutation: gql`
        mutation EditClientSuppliersDetailsById(
          $updateClientSuppliersDetailInput: UpdateClientSuppliersDetailInput!
        ) {
          editClientSuppliersDetailsById(
            updateClientSuppliersDetailInput: $updateClientSuppliersDetailInput
          ) {
            data {
              client_supplier_id
              client_supplier_name
              client_supplier_status
              company_id
              id
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
      response &&
      response?.data?.postAddClientSuppliersFormData?.status ===
        ApiResponse.SUCCESS
    ) {
      return response?.data?.postAddClientSuppliersFormData?.data;
    } else if (
      response &&
      response?.data?.postAddClientSuppliersFormData?.status ===
        ApiResponse.ERROR
    ) {
      return null;
    }
  } catch (error: any) {
    return null;
  }
}

export async function verifyClientSuppliersExistence(
  postData: any
): Promise<any> {
  try {
    const response = await client.query({
      query: gql`
        query CheckExistenceForClient(
          $companyId: Float!
          $clientSupplierName: String
          $clientEmailId: String
          $qbccNumber: String
        ) {
          checkExistenceForClient(
            company_id: $companyId
            client_supplier_name: $clientSupplierName
            client_email_id: $clientEmailId
            qbcc_number: $qbccNumber
          ) {
            data {
              client_email_id
              client_supplier_id
              client_supplier_name
              client_supplier_status
              client_supplier_type
              company_id
              id
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
      response &&
      response?.data?.postAddClientSuppliersFormData?.status ===
        ApiResponse.SUCCESS
    ) {
      return response?.data?.postAddClientSuppliersFormData?.data;
    } else if (
      response &&
      response?.data?.postAddClientSuppliersFormData?.status ===
        ApiResponse.ERROR
    ) {
      return null;
    }
  } catch (error: any) {
    return null;
  }
}

export async function fetchClientSuppliersList(postData: any): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        query GetClientSupplierListsForCompany(
          $getClientSupplierListsInput: GetClientSuppliersListsInput!
        ) {
          getClientSupplierListsForCompany(
            getClientSupplierListsInput: $getClientSupplierListsInput
          ) {
            data {
              client_suppliers_list {
                abn_number
                acn_number
                business_name
                claim_count
                client_email_id
                client_phone_no
                client_supplier_address
                client_supplier_id
                client_supplier_name
                client_supplier_status
                client_supplier_type
                client_website
                company_id
                contract_count
                country
                created_by
                created_on
                entity_type
                id
                latitude
                longitude
                payment_terms
                place_id
                qbcc_number
                region
                related_entity
                tfn_number
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

    if (
      response &&
      response?.data?.getClientSupplierListsForCompany?.status ===
        ApiResponse.SUCCESS
    ) {
      return response?.data?.getClientSupplierListsForCompany?.data;
    } else if (
      response &&
      response?.data?.getClientSupplierListsForCompany?.status ===
        ApiResponse.ERROR
    ) {
      return null;
    }
  } catch (error: any) {
    return null;
  }
}

export async function fetchClientSuppliersById(postData: any): Promise<any> {
  try {
    const response = await client.query({
      query: gql`
        query ViewClientSuppliersDetails($id: String!) {
          viewClientSuppliersDetails(id: $id) {
            data {
              abn_number
              acn_number
              business_name
              client_email_id
              client_phone_no
              client_supplier_address
              client_supplier_id
              client_supplier_name
              client_supplier_status
              client_supplier_type
              client_website
              company_id
              country
              created_by
              created_on
              entity_type
              id
              latitude
              longitude
              payment_terms
              place_id
              qbcc_number
              region
              related_entity
              tfn_number
              account_details {
                account_name
                account_number
                account_type
                bsb_number
                client_supplier_id
                id
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
      response &&
      response?.data?.viewClientSuppliersDetails?.status === ApiResponse.SUCCESS
    ) {
      return response?.data?.viewClientSuppliersDetails?.data;
    } else if (
      response &&
      response?.data?.viewClientSuppliersDetails?.status === ApiResponse.ERROR
    ) {
      return null;
    }
  } catch (error: any) {
    return null;
  }
}

export async function deleteClientSuppliersById(postData: any): Promise<any> {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation UpdateClientSuppliersStatusById(
          $id: String!
          $isDeleted: Boolean!
        ) {
          updateClientSuppliersStatusById(id: $id, is_deleted: $isDeleted) {
            data {
              client_supplier_id
              client_supplier_name
              client_supplier_status
              company_id
              id
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
      response &&
      response?.data?.updateClientSuppliersStatusById?.status ===
        ApiResponse.SUCCESS
    ) {
      return response?.data?.updateClientSuppliersStatusById?.data;
    } else if (
      response &&
      response?.data?.updateClientSuppliersStatusById?.status ===
        ApiResponse.ERROR
    ) {
      return null;
    }
  } catch (error: any) {
    return null;
  }
}

export interface GetClientSuppliersListForProjectsInput {
  project_id: string;
  company_id: string;
}

export async function getClientSuppliersListByProjectId(
  postData: any
): Promise<any> {
  try {
    const response = await client.query({
      query: gql`
        query GetClientSuppliersListByProjectId(
          $getClientSuppliersListForProjectsInput: GetClientSuppliersListForProjectsInput!
        ) {
          getClientSuppliersListByProjectId(
            getClientSuppliersListForProjectsInput: $getClientSuppliersListForProjectsInput
          ) {
            data {
              client_suppliers_list {
                abn_number
                acn_number
                business_name
                claim_count
                client_email_id
                client_phone_no
                client_supplier_address
                client_supplier_id
                client_supplier_name
                client_supplier_status
                client_supplier_type
                client_website
                company_id
                contract_count
                country
                created_by
                created_on
                entity_type
                id
                latitude
                longitude
                payment_terms
                place_id
                qbcc_number
                region
                related_entity
                tfn_number
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

    if (
      response &&
      response?.data?.getClientSuppliersListByProjectId?.status ===
        ApiResponse.SUCCESS
    ) {
      return response?.data?.getClientSuppliersListByProjectId?.data;
    } else if (
      response &&
      response?.data?.getClientSuppliersListByProjectId?.status ===
        ApiResponse.ERROR
    ) {
      return null;
    }
  } catch (error: any) {
    return null;
  }
}
