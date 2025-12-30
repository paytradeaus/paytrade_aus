import { client } from "@/app/api/apolloClientServices";
import { toast } from "@/app/Toaster";
import { ERROR, SUCCESS } from "@/common/constants/messages";
import { gql } from "@apollo/client";

export async function postAddClientSuppliersFormData(
  postData: any
): Promise<any> {
  try {
    // console.log(postData, "createClientSuppliersDetailInput payload");

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

    if (response?.data?.insertClientSupplierDetails?.status === SUCCESS) {
      return {
        status: true,
        message: response?.data?.insertClientSupplierDetails?.message,
      };
    }
    if (response?.data?.insertClientSupplierDetails?.status === ERROR) {
      toast.error(response?.data?.insertClientSupplierDetails?.message);
      return false;
    }
  } catch (error: any) {
    console.error("GraphQL Error:", error);
    return false;
  }
}

export async function updateClientSuppliersById(postData: any): Promise<any> {
  try {
    // console.log(postData, "updateClientSuppliersDetailInput payload");
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

    if (response?.data?.editClientSuppliersDetailsById?.status === SUCCESS) {
      return {
        status: true,
        message: response?.data?.editClientSuppliersDetailsById?.message,
      };
    }
    if (response?.data?.editClientSuppliersDetailsById?.status === ERROR) {
      toast.error(response?.data?.editClientSuppliersDetailsById?.message);
      return false;
    }
  } catch (error: any) {
    console.error("GraphQL Error:", error);
    return false;
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

    if (response?.data?.checkExistenceForClient?.status === SUCCESS) {
      return response?.data?.checkExistenceForClient?.data;
    }
    if (response?.data?.checkExistenceForClient?.status === ERROR) {
      console.error(response?.data?.checkExistenceForClient?.message);
      toast.error(response?.data?.checkExistenceForClient?.message);
      return {};
    }
  } catch (error: any) {
    return {};
  }
}

export async function fetchClientSuppliersList(postData: any): Promise<any> {
  try {
    const response = await client.query({
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

    if (response?.data?.getClientSupplierListsForCompany?.status === SUCCESS) {
      return response?.data?.getClientSupplierListsForCompany?.data;
    }
    if (response?.data?.getClientSupplierListsForCompany?.status === ERROR) {
      console.error(response?.data?.getClientSupplierListsForCompany?.message);
      toast.error(response?.data?.getClientSupplierListsForCompany?.message);
      return {};
    }
  } catch (error: any) {
    return {};
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

    if (response?.data?.viewClientSuppliersDetails?.status === SUCCESS) {
      return response?.data?.viewClientSuppliersDetails?.data;
    }
    if (response?.data?.viewClientSuppliersDetails?.status === ERROR) {
      toast.error(response?.data?.viewClientSuppliersDetails?.message);
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

    if (response?.data?.updateClientSuppliersStatusById?.status === SUCCESS) {
      toast.success(response?.data?.updateClientSuppliersStatusById?.message);
      return true;
    }
    if (response?.data?.updateClientSuppliersStatusById?.status === ERROR) {
      toast.error(response?.data?.updateClientSuppliersStatusById?.message);
      return false;
    }
  } catch (error: any) {
    console.error("GraphQL Error:", error);
    return false;
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

    if (response?.data?.getClientSuppliersListByProjectId?.status === SUCCESS) {
      return response?.data?.getClientSuppliersListByProjectId?.data;
    }
    if (response?.data?.getClientSuppliersListByProjectId?.status === ERROR) {
      console.error(response?.data?.getClientSuppliersListByProjectId?.message);
      toast.error(response?.data?.getClientSuppliersListByProjectId?.message);
      return {};
    }
  } catch (error: any) {
    return {};
  }
}
