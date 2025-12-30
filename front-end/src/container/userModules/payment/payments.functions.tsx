import { gql } from "@apollo/client";
import { toast } from "@/app/Toaster";
import { client } from "@/app/api/adminAPIs/adminAPIs";

interface FetchClientSupplierDetailsForRetentionClaimInput {
  contract_id: number;
  client_supplier_id: number;
}

export const fetchPaymentFromAccountDetailsAndPaymentToAccountListOfSelectedSupplier =
  async (
    payload: FetchClientSupplierDetailsForRetentionClaimInput,
    setLoading?: Function
  ): Promise<any> => {
    try {
      const response = await client.query({
        query: gql`
          query FetchPaymentFromAccountDetailsAndPaymentToAccountListOfSelectedSupplier(
            $payload: FetchPaymentToAccountListOfSelectedSupplierInput!
          ) {
            fetchPaymentFromAccountDetailsAndPaymentToAccountListOfSelectedSupplier(
              payload: $payload
            ) {
              data {
                client_supplier_address
                payment_from_account_details {
                  payment_from_account_bsb_number
                  payment_from_account_id
                  payment_from_account_name
                  payment_from_account_number
                  payment_from_account_type
                }
                payment_to_accounts_list {
                  payment_to_account_bsb_number
                  payment_to_account_id
                  payment_to_account_name
                  payment_to_account_number
                  payment_to_account_type
                }
              }
              message
              status
            }
          }
        `,
        variables: { payload },
        fetchPolicy: "no-cache",
      });

      if (
        response?.data
          ?.fetchPaymentFromAccountDetailsAndPaymentToAccountListOfSelectedSupplier
          ?.status === "SUCCESS"
      ) {
        // Optionally, show a success message
        // toast.success(response?.data?.fetchPaymentFromAccountDetailsAndPaymentToAccountListOfSelectedSupplier?.message);
        return response?.data
          ?.fetchPaymentFromAccountDetailsAndPaymentToAccountListOfSelectedSupplier
          ?.data;
      }

      if (
        response?.data
          ?.fetchPaymentFromAccountDetailsAndPaymentToAccountListOfSelectedSupplier
          ?.status === "ERROR"
      ) {
        // Optionally, show an error message
        // toast.error(response?.data?.fetchPaymentFromAccountDetailsAndPaymentToAccountListOfSelectedSupplier?.message);
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

interface FetchClientSupplierDetailsForPaymentClaimInput {
  // Define the properties of your input object here
  // For example:
  contract_id: number;
  // Add more properties as needed
}

export const fetchClientSupplierDetailsForPaymentClaim = async (
  payload: FetchClientSupplierDetailsForPaymentClaimInput,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await client.query({
      query: gql`
        query FetchClientSupplierDetailsForPaymentClaim(
          $payload: FetchClientSupplierDetailsForPaymentClaimInput!
        ) {
          fetchClientSupplierDetailsForPaymentClaim(payload: $payload) {
            data {
              claim_amount
              client_supplier_address
              client_supplier_id
              client_supplier_name
              client_supplier_type
              initial_contract_sum
              payment_from_account
              payment_from_account_bsb_number
              payment_from_account_name
              payment_from_account_number
              payment_from_account_type
              payment_terms
              payment_to_account
              payment_to_account_bsb_number
              payment_to_account_name
              payment_to_account_number
              payment_to_account_type
              variation_amount
            }
            message
            status
          }
        }
      `,
      variables: {
        payload,
      },
      fetchPolicy: "no-cache",
    });
    if (
      response?.data?.fetchClientSupplierDetailsForPaymentClaim?.status ===
      "SUCCESS"
    ) {
      //   toast.success(
      //     response?.data?.fetchClientSupplierDetailsForPaymentClaim?.message
      //   );
      return response?.data?.fetchClientSupplierDetailsForPaymentClaim?.data;
    }
    if (
      response?.data?.fetchClientSupplierDetailsForPaymentClaim?.status ===
      "ERROR"
    ) {
      //   toast.error(
      //     response?.data?.fetchClientSupplierDetailsForPaymentClaim?.message
      //   );
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

type AddPaymentClaimInput = {
  claim_reference: string;
  client_supplier_id: number;
  client_supplier_type: string;
  company_id: number;
  contract_id: any;
  due_date: string;
  memo: string;
  optional_attachment_ids: string[];
  received_date: string;
  // sent_date: string;
  project_id: any;
  status: string;
  compulsory_attachment_ids: string[];
  claim_amount: number;
  claim_type: string;
  cash_retention_type: string;
  invoices: {
    description: string;
    gst: number;
    quantity: number;
    total_amount_including_gst: any;
    unit_price: number;
  }[];
};

export const addPaymentClaim = async (
  payload: AddPaymentClaimInput
): Promise<any> => {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation AddPaymentClaim($payload: AddPaymentClaimInput!) {
          addPaymentClaim(payload: $payload) {
            data {
              payment_claim_id
            }
            message
            status
          }
        }
      `,
      variables: {
        payload,
      },
    });

    // Handle the response as needed
    if (response?.data?.addPaymentClaim?.status === "SUCCESS") {
      toast.success(response?.data?.addPaymentClaim?.message);
      return response?.data?.addPaymentClaim?.data;
    }
    if (response?.data?.addPaymentClaim?.status === "ERROR") {
      toast.error(response?.data?.addPaymentClaim?.message);
      return null;
    }
    // Return the data
    return null;
  } catch (error) {
    // Handle errors
    console.error("Error in addPaymentClaim:", error);
    console.error("Input Data:", payload);
    throw error;
  }
};

type FetchDetailsOfAPaymentClaimInput = {
  payment_claim_id: string;
  company_id: number;
};

export const fetchDetailsOfAPaymentClaim = async (
  payload: FetchDetailsOfAPaymentClaimInput,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await client.query({
      query: gql`
        query FetchDetailsOfAPaymentClaim(
          $payload: FetchDetailsOfAPaymentClaimInput!
        ) {
          fetchDetailsOfAPaymentClaim(payload: $payload) {
            data {
              associated_retention_sub_payment_id
              beneficiary_type
              cash_retention_type
              claim_amount
              claim_overview_buttons
              claim_reference
              list_status
              claim_type
              client_supplier_address
              client_supplier_id
              client_supplier_name
              contract_id
              contract_name
              created_on
              due_date
              gst_summary
              initial_contract_sum
              invoices {
                description
                gst
                payment_claim_id
                quantity
                total_amount_including_gst
                unit_price
              }
              is_gst_optional
              memo
              notice_ids
              payment_claim_id
              payment_from_account_bsb_number
              payment_from_account_name
              payment_from_account_number
              payment_from_account_type
              payment_terms
              payment_to_account_bsb_number
              payment_to_account_name
              payment_to_account_number
              payment_to_account_type
              previous_claim_amount
              project_id
              project_name
              received_date
              retained_amount
              retention_id
              sent_date
              status
              status_in_ui
              sub_total_summary
              variation_amount
            }
            message
            status
          }
        }
      `,
      variables: {
        payload,
      },
      fetchPolicy: "no-cache",
    });
    if (response?.data?.fetchDetailsOfAPaymentClaim?.status === "SUCCESS") {
      return response?.data?.fetchDetailsOfAPaymentClaim?.data;
    }
    if (response?.data?.fetchDetailsOfAPaymentClaim?.status === "ERROR") {
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

interface EditDetailsOfAPaymentClaimInput {
  payment_claim_id: string;
  company_id: string;
}

export const editDetailsOfAPaymentClaim = async (
  payload: EditDetailsOfAPaymentClaimInput,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation EditDetailsOfAPaymentClaim(
          $payload: EditDetailsOfAPaymentClaimInput!
        ) {
          editDetailsOfAPaymentClaim(payload: $payload) {
            data
            message
            status
          }
        }
      `,
      variables: {
        payload,
      },
      fetchPolicy: "no-cache",
    });
    if (response?.data?.editDetailsOfAPaymentClaim?.status === "SUCCESS") {
      toast.success(response?.data?.editDetailsOfAPaymentClaim?.message);
      return true;
    }
    if (response?.data?.editDetailsOfAPaymentClaim?.status === "ERROR") {
      toast.error(response?.data?.editDetailsOfAPaymentClaim?.message);
      console.error(response?.data);
      return false;
    }
    return false;
  } catch (error: any) {
    toast.error(error.message || "Something went wrong in API");
    console.error("GraphQL Error:", error);
    return false;
  } finally {
    setLoading && setLoading(false);
  }
};

type GetProjectsListInput = {
  client_supplier_id: number;
};

export const getProjectsListByClientSupplierId = async (
  payload: GetProjectsListInput,
  setLoading?: Function
): Promise<any> => {
  try {
    if (setLoading) setLoading(true);

    const response = await client.query({
      query: gql`
        query GetProjectsListByClientSupplierId(
          $getProjectsListInput: GetProjectsListInput!
        ) {
          getProjectsListByClientSupplierId(
            getProjectsListInput: $getProjectsListInput
          ) {
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
        getProjectsListInput: payload,
      },
      fetchPolicy: "no-cache",
    });

    if (
      response?.data?.getProjectsListByClientSupplierId?.status === "SUCCESS"
    ) {
      return response?.data?.getProjectsListByClientSupplierId?.data;
    }
    if (response?.data?.getProjectsListByClientSupplierId?.status === "ERROR") {
      toast.error(response?.data?.getProjectsListByClientSupplierId?.message);
      return null;
    }
    return null;
  } catch (error: any) {
    toast.error(error.message || "Something went wrong in API");
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    if (setLoading) setLoading(false);
  }
};

type GetContractsListInput = {
  client_supplier_id: number;
  project_id: number;
};

export const getContractsListByClientSupplierId = async (
  payload: GetContractsListInput,
  setLoading?: Function
): Promise<any> => {
  try {
    if (setLoading) setLoading(true);

    const response = await client.query({
      query: gql`
        query GetContractsListByClientSupplierId(
          $getContractsListInput: GetContractsListInput!
        ) {
          getContractsListByClientSupplierId(
            getContractsListInput: $getContractsListInput
          ) {
            data {
              claim_amount
              client_supplier_id
              client_supplier_role
              contract_date
              contract_id
              contract_name
              contract_status
              contract_type
              defect_liability_end_date
              id
              initial_contract_sum
              payment_terms
              project_id
              retention_type
              variation_amount
            }
            message
            status
          }
        }
      `,
      variables: {
        getContractsListInput: payload,
      },
      fetchPolicy: "no-cache",
    });

    if (
      response?.data?.getContractsListByClientSupplierId?.status === "SUCCESS"
    ) {
      return response?.data?.getContractsListByClientSupplierId?.data;
    }
    if (
      response?.data?.getContractsListByClientSupplierId?.status === "ERROR"
    ) {
      toast.error(response?.data?.getContractsListByClientSupplierId?.message);
      return null;
    }
    return null;
  } catch (error: any) {
    toast.error(error.message || "Something went wrong in API");
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    if (setLoading) setLoading(false);
  }
};

export const TriggerPaymentClaimNotices = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation TriggerPaymentClaimNotices(
          $payload: triggerPaymentClaimNoticesInput!
        ) {
          triggerPaymentClaimNotices(payload: $payload) {
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
    if (response?.data?.triggerPaymentClaimNotices?.status === "SUCCESS") {
      toast.success(response?.data?.triggerPaymentClaimNotices?.message);
      return true;
    }
    if (response?.data?.triggerPaymentClaimNotices?.status === "ERROR") {
      toast.error(response?.data?.triggerPaymentClaimNotices?.message);
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

type FetchDetailsOfAPaymentClaimForImportInput = {
  fetchDetailsOfAPaymentClaimForImportId: string;
};

export const fetchDetailsOfAPaymentClaimForImport = async (
  payload: FetchDetailsOfAPaymentClaimForImportInput,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await client.query({
      query: gql`
        query FetchDetailsOfAPaymentClaimForImport(
          $fetchDetailsOfAPaymentClaimForImportId: String!
        ) {
          fetchDetailsOfAPaymentClaimForImport(
            id: $fetchDetailsOfAPaymentClaimForImportId
          ) {
            data {
              cash_retention_type
              claim_amount
              claim_type
              company_id
              invoice_list {
                description
                gst
                quantity
                total_amount_including_gst
                unit_price
              }
              is_gst_optional
              project_id
              gst_summary
              sub_total_summary
            }
            message
            status
          }
        }
      `,
      variables: {
        fetchDetailsOfAPaymentClaimForImportId:
          payload.fetchDetailsOfAPaymentClaimForImportId,
      },
      fetchPolicy: "no-cache",
    });

    if (
      response?.data?.fetchDetailsOfAPaymentClaimForImport?.status === "SUCCESS"
    ) {
      return response?.data?.fetchDetailsOfAPaymentClaimForImport?.data;
    }
    if (
      response?.data?.fetchDetailsOfAPaymentClaimForImport?.status === "ERROR"
    ) {
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
