import { gql } from "@apollo/client";
import { toast } from "@/app/Toaster";
import { client } from "@/app/api/apolloClientServices";
import { SOMETHING_WENT_WRONG } from "@/common/constants/messages";

export const getProjectsLists = async (
  companyId: number,
  isArchived?: any,
  setLoading?: Function
): Promise<any[] | null> => {
  try {
    const response = await client.query({
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
      variables: {
        companyId,
        isArchived: isArchived || false,
      },
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
    toast.error(error.message || SOMETHING_WENT_WRONG);
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
    const response = await client.query({
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
    toast.error(error.message || SOMETHING_WENT_WRONG);
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};

interface GetBankAccountListInput {
  company_id: number;
  type: "Client" | "Supplier" | null; // Assuming type can be either "Client" or "Supplier"
  project_id: number;
  client_supplier_id: number | null;
  retention_type: "Cash" | "Bank guaranteed" | "None" | string; // Assuming retention_type can be one of these options
}

export const getBankAccountLists = async (
  getBankAccountListInput: any,
  setLoading?: Function
): Promise<any[] | null> => {
  try {
    const response = await client.query({
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
    toast.error(error.message || SOMETHING_WENT_WRONG);
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};

export const insertContractDetails = async (
  inputData: Object
): Promise<any> => {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation InsertContractDetails(
          $createContractDetailInput: CreateContractDetailInput!
        ) {
          insertContractDetails(
            createContractDetailInput: $createContractDetailInput
          ) {
            data {
              client_supplier_id
              company_id
              contract_name
              contract_status
              id
              project_id
              contract_id
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
      toast.success(response?.data?.insertContractDetails?.message);
      return response?.data?.insertContractDetails?.data;
    }
    if (response?.data?.insertContractDetails?.status === "ERROR") {
      toast.error(response?.data?.insertContractDetails?.message);
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

export interface ContractType {
  attachment_id?: string;
  client_supplier_id?: string;
  company_id?: string;
  contract_date?: string;
  contract_id?: string;
  contract_name?: string;
  contract_start_date?: string;
  contract_status?: string;
  defect_liability_end_date?: string;
  id?: string;
  initial_contract_sum?: string;
  payment_terms?: string;
  project_id?: string;
  retention_type?: string;
  project_name?: string;
  variation_amount?: string;
  client_supplier_role?: string;
  contract_type?: string;
  buyer_name?: string;
  client_supplier_name?: string;
  client_supplier_type?: string;
  company_name?: string;
  seller_name?: string;
  payment_from_account?: string;
  payment_to_account?: string;
  retention_from_account?: string;
  previous_status?: string;
}

export const getContractListsForCompany = async (
  data: any,
  setLoading?: Function
): Promise<{ total_count: number; contract_list: ContractType[] } | any> => {
  try {
    const response = await client.query({
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
          client_supplier_type: data?.client_supplier_type || null,
          isAlphabeticalOrder: data?.isAlphabeticalOrder || null,
        },
      },
      fetchPolicy: "no-cache",
    });
    if (response?.data?.getContractListsForCompany?.status === "SUCCESS") {
      return response?.data?.getContractListsForCompany?.data;
    }
    if (response?.data?.getContractListsForCompany?.status === "ERROR") {
      return null;
    }
    return null;
  } catch (error: any) {
    toast.error(error.message || "Something went wrong in the API");
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};

export interface UpdateContractStatusInput {
  id: string;
  status: string;
}

export const updateContractStatusById = async (
  data: UpdateContractStatusInput,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation UpdateContractStatusById($id: String!, $status: String!) {
          updateContractStatusById(id: $id, status: $status) {
            data {
              attachment_id
              client_supplier_id
              company_id
              contract_date
              contract_id
              contract_name
              contract_start_date
              contract_status
              defect_liability_end_date
              id
              initial_contract_sum
              payment_terms
              project_id
              retention_type
              project_name
              variation_amount
              client_supplier_role
              contract_type
              buyer_name
              client_supplier_name
              client_supplier_type
              company_name
              payment_from_account
              payment_to_account
              retention_from_account
              seller_name
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
    if (response?.data?.updateContractStatusById?.status === "SUCCESS") {
      toast.success(response?.data?.updateContractStatusById?.message);
      return true;
    }
    if (response?.data?.updateContractStatusById?.status === "ERROR") {
      toast.error(response?.data?.updateContractStatusById?.message);
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

export const viewContractDetailsById = async (
  data: { id: string },
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await client.query({
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
    toast.error(error.message || "Something went wrong in API");
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
    const response = await client.mutate({
      mutation: gql`
        mutation EditContractDetailsById(
          $updateContractDetailInput: UpdateContractDetailInput!
        ) {
          editContractDetailsById(
            updateContractDetailInput: $updateContractDetailInput
          ) {
            data {
              client_supplier_id
              company_id
              contract_id
              contract_status
              id
              initial_contract_sum
              payment_terms
              project_id
              retention_type
              client_supplier_type
              payment_from_account
              payment_to_account
              retention_from_account
              client_supplier_role
              contract_type
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
      toast.success(response?.data?.editContractDetailsById?.message);
      return response?.data?.editContractDetailsById?.data;
    }
    if (response?.data?.editContractDetailsById?.status === "ERROR") {
      toast.error(response?.data?.editContractDetailsById?.message);
      console.error(response?.data);
      return {};
    }
    return {};
  } catch (error: any) {
    toast.error(error.message || "Something went wrong in API");
    console.error("GraphQL Error:", error);
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
    const response = await client.mutate({
      mutation: gql`
        mutation TriggerContractNotices(
          $payload: triggerContractNoticesInput!
        ) {
          triggerContractNotices(payload: $payload) {
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
    if (response?.data?.triggerContractNotices?.status === "SUCCESS") {
      toast.success(response?.data?.triggerContractNotices?.message);
      return true;
    }
    if (response?.data?.triggerContractNotices?.status === "ERROR") {
      toast.error(response?.data?.triggerContractNotices?.message);
      console.error(response?.data);
      return false;
    }
  } catch (error: any) {
    toast.error(error.message || "Something went wrong in API");
    console.error("GraphQL Error:", error);
    return false;
  } finally {
    setLoading && setLoading(false);
  }
};
