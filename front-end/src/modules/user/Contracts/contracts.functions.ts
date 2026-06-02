import { apolloClient } from "@/network/apolloClient";
import { ApiResponse } from "@/shared/constant/messages";
import { IContractListDetail } from "./contracts.types";
import { gql } from "@apollo/client";
import { showErrorToast, showSuccessToast } from "@/components/Toaster";
import { ERROR, SUCCESS } from "@/app/message";

export const insertContractDetails = async (
  inputData: Object
): Promise<any> => {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation InsertContractDetails(
          $createContractDetailInput: CreateContractDetailInput!
        ) {
          insertContractDetails(
            createContractDetailInput: $createContractDetailInput
          ) {
            data {
              client_supplier_id
              client_supplier_type
              company_id
              contract_id
              contract_name
              contract_status
              id
              notice_generated
              notices {
                notice_previews {
                  file_details {
                    attachment_type
                    file
                    file_name
                    file_path
                    file_type
                    id
                  }
                  mail_uuid
                }
                qbcc_notice_previews {
                  notice_uuid
                  qbcc_file_details {
                    attachment_type
                    file
                    file_name
                    file_path
                    file_type
                    id
                  }
                }
              }
              project_id
            }
            message
            status
          }
        }
      `,
      variables: {
        createContractDetailInput: inputData,
      },
    });

    // Handle the response as needed
    if (response?.data?.insertContractDetails?.status === "SUCCESS") {
      showSuccessToast(response?.data?.insertContractDetails?.message);
      return response?.data?.insertContractDetails?.data;
    }
    if (response?.data?.insertContractDetails?.status === "ERROR") {
      showErrorToast(response?.data?.insertContractDetails?.message);
      return null;
    }
    // Return the array of contract details
    return null;
  } catch (error) {
    // Handle errors
    console.error("Error in insertContractDetails:", error);
    console.error("Input Data:", inputData);
    throw error;
  }
};

export const createContractInPaytradeFromXeroData = async (
  inputData: Object
): Promise<any> => {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation CreateContractInPaytrade(
          $companyId: Float!
          $contractId: String!
          $payload: CreateContractDetailInput
          $syncId: String
        ) {
          createContractInPaytrade(
            company_id: $companyId
            contract_id: $contractId
            payload: $payload
            sync_id: $syncId
          ) {
            status
            message
            data {
              contract_id
              contract_name
              contract_status
              id
              mapped_status
              xero_contract_id
            }
          }
        }
      `,
      variables: inputData,
    });

    // Handle the response as needed
    if (response?.data?.createContractInPaytrade?.status === "SUCCESS") {
      showSuccessToast(response?.data?.createContractInPaytrade?.message);
      return response?.data?.createContractInPaytrade?.data;
    }
    if (response?.data?.createContractInPaytrade?.status === "ERROR") {
      showErrorToast(response?.data?.createContractInPaytrade?.message);
      return null;
    }
    // Return the array of contract details
    return null;
  } catch (error) {
    throw error;
  }
};

export const getContractListsForCompany = async (
  data: any,
  setLoading?: Function
): Promise<
  { total_count: number; contract_list: IContractListDetail[] } | any
> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query GetContractListsForCompany(
          $getContractListsInput: GetContractListsInput!
        ) {
          getContractListsForCompany(
            getContractListsInput: $getContractListsInput
          ) {
            data {
              contract_list {
                attachment_id
                buyer_name
                client_supplier_id
                client_supplier_name
                client_supplier_role
                client_supplier_type
                company_id
                company_name
                contract_date
                contract_id
                contract_name
                contract_start_date
                contract_status
                contract_type
                contract_billing_type
                defect_liability_end_date
                formatted_initial_contract_sum
                formatted_variation_amount
                id
                initial_contract_sum
                payment_from_account
                payment_terms
                payment_to_account
                previous_status
                project_id
                project_name
                project_status
                retention_from_account
                retention_type
                seller_name
                variation_amount
              }
              project_list {
                project_id
                project_name
              }
              total_count
            }
            message
            status
          }
        }
      `,
      variables: {
        getContractListsInput: {
          company_id: data?.company_id,
          page_number: data?.page_number,
          page_size: data?.page_size,
          search: data?.search,
          date_filter: data?.dateFilter || null,
          start_date: data?.startDate || null,
          end_date: data?.endDate || null,
          contract_status: data?.contract_status || null,
          project_id: data?.project_id || null,
          contact_id: data?.contact_id || null,
          client_supplier_type: data?.client_supplier_type || null,
          isAlphabeticalOrder: data?.isAlphabeticalOrder || null,
          sorting_field: data?.sorting_field || null,
          sorting_order: data?.sorting_order || null,
        },
      },
      fetchPolicy: "no-cache",
    });
    if (
      response?.data?.getContractListsForCompany?.status === ApiResponse.SUCCESS
    ) {
      return response?.data?.getContractListsForCompany?.data;
    }
    if (
      response?.data?.getContractListsForCompany?.status === ApiResponse.ERROR
    ) {
      return null;
    }
    return null;
  } catch (error: any) {
    showErrorToast(error.message || ApiResponse.SOMETHING_WENT_WRONG);
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};

export const getProjectsLists = async (
  data?: { companyId: number; isArchived?: boolean },
  setLoading?: Function
): Promise<any[] | null> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query Query($companyId: Float!, $isArchived: Boolean) {
          getProjectsLists(company_id: $companyId, is_archived: $isArchived) {
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
      variables: data,
      fetchPolicy: "no-cache",
    });
    if (response?.data?.getProjectsLists?.status === "SUCCESS") {
      return response?.data?.getProjectsLists?.data;
    }
    if (response?.data?.getProjectsLists?.status === "ERROR") {
      return null;
    }
    return null;
  } catch (error: any) {
    showErrorToast(error.message);
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};

export const getClientSupplierLists = async (
  companyId: number,
  setLoading?: Function
): Promise<any[] | null> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query GetClientSupplierLists($companyId: Float!) {
          getClientSupplierLists(company_id: $companyId) {
            data {
              client_email_id
              client_supplier_id
              client_supplier_name
              client_supplier_status
              client_supplier_type
              id
              related_entity
            }
            message
            status
          }
        }
      `,
      variables: {
        companyId,
      },
      fetchPolicy: "no-cache",
    });
    if (response?.data?.getClientSupplierLists?.status === "SUCCESS") {
      return response?.data?.getClientSupplierLists?.data;
    }
    if (response?.data?.getClientSupplierLists?.status === "ERROR") {
      return null;
    }
    return null;
  } catch (error: any) {
    showErrorToast(error.message);
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};

export const viewContractDetailsById = async (
  data: { id: string },
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query ViewContractDetailsById($id: String!) {
          viewContractDetailsById(id: $id) {
            data {
              attachment_id
              buyer_name
              client_supplier_address
              client_supplier_id
              client_supplier_name
              client_supplier_role
              client_supplier_type
              company_id
              notice_generated
              company_name
              contract_date
              contract_id
              contract_name
              contract_start_date
              contract_status
              contract_type
              contract_billing_type
              defect_liability_end_date
              file
              file_name
              file_path
              file_type
              id
              formatted_initial_contract_sum
              initial_contract_sum
              payment_from_account
              payment_from_account_name
              payment_from_account_type
              payment_terms
              payment_to_account
              payment_to_account_name
              payment_to_account_type
              previous_status
              project_id
              project_name
              project_role
              related_entity
              retention_from_account
              retention_from_account_name
              retention_from_account_type
              retention_type
              seller_name
              site_address
              variation_amount
            }
            message
            status
          }
        }
      `,
      variables: {
        ...data,
      },
      fetchPolicy: "no-cache",
    });
    if (response?.data?.viewContractDetailsById?.status === "SUCCESS") {
      return response?.data?.viewContractDetailsById?.data;
    }
    if (response?.data?.viewContractDetailsById?.status === "ERROR") {
      return null;
    }
    return null;
  } catch (error: any) {
    showErrorToast(error.message || "Something went wrong in API");
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};

export interface UpdateContractDetailInput {
  attachment_id?: any;
  client_supplier_id?: any;
  company_id?: any;
  contract_date?: any;
  contract_name?: any;
  contract_start_date?: any;
  contract_status?: any;
  defect_liability_end_date?: any;
  id: any;
  initial_contract_sum?: any;
  payment_terms?: any;
  project_id?: any;
  project_name?: any;
  variation_amount?: any;
  retention_type?: any;
  client_supplier_role?: any;
  contract_type?: any;
  contract_billing_type?: string;
  buyer_name?: any;
  client_supplier_name?: any;
  client_supplier_type?: any;
  company_name?: any;
  payment_from_account?: any;
  payment_to_account?: any;
  retention_from_account?: any;
  seller_name?: any;
}

export const editContractDetailsById = async (
  data: UpdateContractDetailInput,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation EditContractDetailsById(
          $updateContractDetailInput: UpdateContractDetailInput!
        ) {
          editContractDetailsById(
            updateContractDetailInput: $updateContractDetailInput
          ) {
            data {
              active_payment_claims
              attachment_id
              buyer_name
              client_supplier_address
              client_supplier_id
              client_supplier_name
              client_supplier_role
              client_supplier_type
              company_id
              company_name
              contract_date
              contract_id
              contract_name
              contract_start_date
              contract_status
              contract_type
              contract_billing_type
              defect_liability_end_date
              file
              file_name
              file_path
              file_type
              formatted_initial_contract_sum
              id
              initial_contract_sum
              notice_generated
              notices {
                notice_previews {
                  file_details {
                    attachment_type
                    file
                    file_name
                    file_path
                    file_type
                    id
                  }
                  mail_uuid
                }
                qbcc_notice_previews {
                  notice_uuid
                  qbcc_file_details {
                    attachment_type
                    file
                    file_name
                    file_path
                    file_type
                    id
                  }
                }
              }
              payment_from_account
              payment_from_account_name
              payment_from_account_type
              payment_terms
              payment_to_account
              payment_to_account_name
              payment_to_account_type
              previous_status
              project_id
              project_name
              project_role
              related_entity
              retention_from_account
              retention_from_account_name
              retention_from_account_type
              retention_type
              seller_name
              site_address
              variation_amount
            }
            message
            status
          }
        }
      `,
      variables: {
        updateContractDetailInput: {
          ...data,
        },
      },
      fetchPolicy: "no-cache",
    });
    if (response?.data?.editContractDetailsById?.status === "SUCCESS") {
      showSuccessToast(response?.data?.editContractDetailsById?.message);
      return response?.data?.editContractDetailsById?.data;
    }
    if (response?.data?.editContractDetailsById?.status === "ERROR") {
      showErrorToast(response?.data?.editContractDetailsById?.message);
      console.error(response?.data);
      return {};
    }
    return {};
  } catch (error: any) {
    const gqlErr = error?.graphQLErrors?.[0];
    const detailedMsg =
      gqlErr?.extensions?.exception?.message ||
      gqlErr?.extensions?.response?.message ||
      (Array.isArray(gqlErr?.extensions?.response?.message)
        ? gqlErr.extensions.response.message.join("; ")
        : null) ||
      gqlErr?.message ||
      error?.networkError?.result?.errors?.[0]?.message ||
      error?.message ||
      "Something went wrong in API";
    showErrorToast(detailedMsg);
    console.error("GraphQL Error (editContractDetailsById):", {
      message: error?.message,
      graphQLErrors: error?.graphQLErrors,
      networkError: error?.networkError,
      sentVariables: { updateContractDetailInput: data },
    });
    return {};
  } finally {
    setLoading && setLoading(false);
  }
};

export const TriggerContractNotices = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation TriggerContractNotices(
          $payload: triggerContractNoticesInput!
        ) {
          triggerContractNotices(payload: $payload) {
            data {
              notice_previews {
                file_details {
                  attachment_type
                  file
                  file_name
                  file_path
                  file_type
                  id
                }
                mail_uuid
              }
              qbcc_notice_previews {
                notice_uuid
                qbcc_file_details {
                  attachment_type
                  file
                  file_name
                  file_path
                  file_type
                  id
                }
              }
            }
            message
            status
          }
        }
      `,
      variables: {
        payload: data,
      },
      fetchPolicy: "no-cache",
    });
    const resData = response?.data?.triggerContractNotices;

    if (resData?.status === "SUCCESS") {
      showSuccessToast(resData?.message);
      return {
        notice_previews: resData?.data?.notice_previews || [],
        qbcc_notice_previews: resData?.data?.qbcc_notice_previews || [],
      };
    }
    if (resData?.status === "ERROR") {
      showErrorToast(resData?.message);
      console.error(resData);
      return { notice_previews: [], qbcc_notice_previews: [] };
    }
    return [];
  } catch (error: any) {
    showErrorToast(error.message || "Something went wrong in API");
    console.error("GraphQL Error:", error);
    return [];
  } finally {
    setLoading && setLoading(false);
  }
};

export const getBankAccountLists = async (
  getBankAccountListInput: any,
  setLoading?: Function
): Promise<any[] | null> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query GetBankAccountLists(
          $getBankAccountListInput: GetBankAccountListInput!
        ) {
          getBankAccountLists(
            getBankAccountListInput: $getBankAccountListInput
          ) {
            data {
              payment_from_account {
                account_name
                account_type
                bank_account_id
                id
              }
              payment_to_account {
                account_name
                account_type
                bank_account_id
                id
              }
              retention_from_account {
                account_name
                account_type
                bank_account_id
                id
              }
            }
            message
            status
          }
        }
      `,
      variables: {
        getBankAccountListInput,
      },
      fetchPolicy: "no-cache",
    });
    if (response?.data?.getBankAccountLists?.status === "SUCCESS") {
      return response?.data?.getBankAccountLists?.data;
    }
    if (response?.data?.getBankAccountLists?.status === "ERROR") {
      return null;
    }
    return null;
  } catch (error: any) {
    showErrorToast(error.message);
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};

export async function checkExistenceForContract(postData: any): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        query CheckExistenceForContract(
          $companyId: Float!
          $clientSupplierType: String!
          $contractName: String
        ) {
          checkExistenceForContract(
            company_id: $companyId
            client_supplier_type: $clientSupplierType
            contract_name: $contractName
          ) {
            data {
              client_supplier_id
              company_id
              contract_id
              contract_name
              contract_status
              id
              notice_generated
              project_id
            }
            message
            status
          }
        }
      `,
      variables: postData,
      fetchPolicy: "no-cache",
    });

    if (response?.data?.checkExistenceForContract?.status === SUCCESS) {
      return response?.data?.checkExistenceForContract?.data;
    }
    if (response?.data?.checkExistenceForContract?.status === ERROR) {
      showErrorToast(response?.data?.checkExistenceForContract?.message);
      return {};
    }
  } catch (error: any) {
    return {};
  }
}
