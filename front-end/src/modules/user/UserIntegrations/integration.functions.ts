import { SUCCESS } from "@/app/message";
import { showErrorToast, showSuccessToast } from "@/components/Toaster";
import apolloClient from "@/network/apolloClient";
import { ApiResponse } from "@/shared/constant/messages";
import { gql } from "@apollo/client";
import { toast } from "react-toastify";

export const getXeroAuthURL = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query GetAuthUrl($companyId: Float!) {
          getAuthUrl(company_id: $companyId) {
            message
            status
          }
        }
      `,
      variables: data,
      fetchPolicy: "no-cache",
    });
    return response?.data?.getAuthUrl?.message || [];
  } catch (error: any) {
    showErrorToast(ApiResponse.ERROR);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};

export const getIntegrationListsForCompany = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query GetIntegrationListsForCompany(
          $getIntegrationListsInput: GetIntegrationListsInput!
        ) {
          getIntegrationListsForCompany(
            getIntegrationListsInput: $getIntegrationListsInput
          ) {
            data {
              integration_list {
                company_id
                id
                integration_date
                integration_id
                integration_name
                integration_status
                integration_type
              }
              total_count
            }
            message
            status
          }
        }
      `,
      variables: data,
      fetchPolicy: "no-cache",
    });
    if (
      response?.data?.getIntegrationListsForCompany?.status ===
      ApiResponse.SUCCESS
    ) {
      return response?.data?.getIntegrationListsForCompany?.data || [];
    }
  } catch (error: any) {
    showErrorToast(ApiResponse.ERROR);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};

export const disconnectFromXero = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation DisconnectFromXero(
          $disconnectFromXeroId: String!
          $type: String!
        ) {
          disconnectFromXero(id: $disconnectFromXeroId, type: $type) {
            message
            status
          }
        }
      `,
      variables: data,
      fetchPolicy: "no-cache",
    });

    const res = response?.data?.disconnectFromXero;
    if (res?.status === ApiResponse.XERO_REFRESH && res?.message) {
      window.open(res.message, "_self");
      return null; // stop further flow
    }

    if (res?.status === ApiResponse.SUCCESS) {
      localStorage.removeItem("xeroIntegrationId");
      showSuccessToast(res?.message);
      return;
    }
  } catch (error: any) {
    showErrorToast(ApiResponse.ERROR);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};

export const pauseOrUnpauseXero = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation PauseOrUnpauseXero(
          $pauseOrUnpauseXeroId: String!
          $isPaused: Boolean!
        ) {
          pauseOrUnpauseXero(id: $pauseOrUnpauseXeroId, is_paused: $isPaused) {
            message
            status
          }
        }
      `,
      variables: data,
      fetchPolicy: "no-cache",
    });
    if (response?.data?.pauseOrUnpauseXero?.status === ApiResponse.SUCCESS) {
      showSuccessToast(response?.data?.pauseOrUnpauseXero?.message);
      return;
    }
  } catch (error: any) {
    showErrorToast(ApiResponse.ERROR);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};

export const getTrackingCategories = async (
  data: any,
  showToast: boolean
): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query GetTrackingCategories($companyId: Float!) {
          getTrackingCategories(company_id: $companyId) {
            data {
              total_count
              tracking_category_list {
                id
                name
                status
              }
            }
            message
            status
          }
        }
      `,
      variables: data,
      fetchPolicy: "no-cache",
    });

    const res = response?.data?.getTrackingCategories;

    if (res?.status === ApiResponse.XERO_REFRESH && res?.message) {
      window.open(res.message, "_self");
      return null; // stop further flow
    }

    if (res?.status === ApiResponse.SUCCESS) {
      if (showToast) showSuccessToast(res?.message);
      return res?.data || [];
    }
  } catch (error: any) {
    showErrorToast(ApiResponse.ERROR);
    return null;
  }
};

export const updateTrackingCategory = async (
  data: any,
  setLoading?: any
): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation UpdateTrackingCategory(
          $categoryId: String!
          $categoryType: String!
          $id: String!
        ) {
          updateTrackingCategory(
            category_id: $categoryId
            category_type: $categoryType
            id: $id
          ) {
            message
            status
          }
        }
      `,
      variables: data,
      fetchPolicy: "no-cache",
    });
    if (
      response?.data?.updateTrackingCategory?.status === ApiResponse.SUCCESS
    ) {
      showSuccessToast(response?.data?.updateTrackingCategory?.message);
      return true;
    } else {
      showErrorToast(response?.data?.updateTrackingCategory?.message);
      return true;
    }
  } catch (error: any) {
    showErrorToast(ApiResponse.ERROR);
    return false;
  } finally {
    setLoading && setLoading(false);
  }
};

export const getXeroDetailsForCompany = async (
  setLoading?: Function
): Promise<any> => {
  try {
    let integrationId = localStorage.getItem("xeroIntegrationId");

    if (!integrationId) {
      const response = await getIntegrationListsForCompany({
        getIntegrationListsInput: {
          company_id: +(localStorage.getItem("companyId") || 0),
        },
      });

      const xeroIntegration = response?.integration_list?.find(
        (val: any) => val.integration_name === "Xero"
      );

      if (!xeroIntegration?.id) {
        showErrorToast("Xero integration not found");
        return null;
      }

      localStorage.setItem("xeroIntegrationId", xeroIntegration.id);
      integrationId = xeroIntegration.id;
    }

    const response = await apolloClient.query({
      query: gql`
        query GetXeroDetailsForCompany($getXeroDetailsForCompanyId: String!) {
          getXeroDetailsForCompany(id: $getXeroDetailsForCompanyId) {
            data {
              action_buttons
              bill_code
              company_id
              contract_category_id
              contract_category_name
              id
              integration_id
              integration_list_id
              integration_name
              integration_status
              integration_type
              invoice_code
              liability_payable_code
              liability_receivable_code
              simplified_retention_accounting
              pt_to_xero_bank_auto_create
              xero_to_pt_bank_auto_create
              pt_to_xero_contact_auto_create
              xero_to_pt_contact_auto_create
              pt_to_xero_project_auto_create
              xero_to_pt_project_auto_create
              pt_to_xero_contract_auto_create
              xero_to_pt_contract_auto_create
              sync_contact_financial_to_xero
              sync_contact_financial_to_pt
              smart_contract_auto_create
              project_category_id
              project_category_name
              pt_to_xero_bill_as_draft
              pt_to_xero_invoice_as_draft
              pt_to_xero_payment_as_draft
              retention_payable_release_code
              retention_payable_retained_code
              retention_receivable_release_code
              retention_receivable_retained_code
              status
              tenant_id
              tenant_name
              tenant_type
              xero_to_pt_bill_as_draft
              xero_to_pt_invoice_as_draft
              xero_to_pt_payment_as_draft
              reference_format
              invoice_tax_code
              bill_tax_code
              wait_time
            }
            message
            status
          }
        }
      `,
      variables: {
        getXeroDetailsForCompanyId: integrationId,
      },
      fetchPolicy: "no-cache",
    });
    const res = response?.data?.getXeroDetailsForCompany;
    // 🚀 Handle XERO_REFRESH redirect
    if (res?.status === ApiResponse.XERO_REFRESH && res?.message) {
      window.open(res.message, "_self");
      return null; // stop further flow
    }
    if (res?.status === ApiResponse.SUCCESS) {
      return res?.data || [];
    }
    return null;
  } catch (error: any) {
    showErrorToast(ApiResponse.ERROR);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};

export const getXeroContactListsForCompany = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query GetXeroContactListsForCompany(
          $payload: GetXeroContactListsInput!
        ) {
          getXeroContactListsForCompany(payload: $payload) {
            data {
              contact_list {
                contact_id
                contact_name
                contact_status
                id
                mapped_status
                merge_to_contact_id
                pt_contact_id
                pt_contact_name
                tenant_id
              }
              total_count
            }
            message
            status
          }
        }
      `,
      variables: data,
      fetchPolicy: "no-cache",
    });
    if (
      response?.data?.getXeroContactListsForCompany?.status ===
      ApiResponse.SUCCESS
    ) {
      return response?.data?.getXeroContactListsForCompany?.data || [];
    }
    if (
      response?.data?.getXeroContactListsForCompany?.status ===
      ApiResponse.ERROR
    ) {
      showErrorToast(response?.data?.getXeroContactListsForCompany?.message);
      return null;
    }
  } catch (error: any) {
    showErrorToast(ApiResponse.ERROR);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};

export const getPaytradeContactListsForCompany = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query GetPaytradeContactListsForCompany(
          $payload: GetPaytradeContactListsInput!
        ) {
          getPaytradeContactListsForCompany(payload: $payload) {
            data {
              contact_list {
                contact_id
                contact_name
                contact_status
                id
                mapped_status
                xero_contact_id
              }
              total_count
            }
            message
            status
          }
        }
      `,
      variables: data,
      fetchPolicy: "no-cache",
    });
    return (
      response?.data?.getPaytradeContactListsForCompany?.data?.contact_list ||
      []
    );
  } catch (error: any) {
    showErrorToast(ApiResponse.ERROR);
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};

export const getMappedContactListsForCompany = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query GetMappedContactLists($payload: GetMappedXeroContactListsInput!) {
          getMappedContactLists(payload: $payload) {
            data {
              total_count
              contact_list {
                contact_id
                contact_name
                contact_status
                id
                mapped_status
                merge_to_contact_id
                pt_contact_id
                pt_contact_name
                tenant_id
              }
            }
            message
            status
          }
        }
      `,
      variables: data,
      fetchPolicy: "no-cache",
    });
    if (response?.data?.getMappedContactLists?.status === ApiResponse.SUCCESS) {
      return response?.data?.getMappedContactLists?.data || [];
    }
    if (response?.data?.getMappedContactLists?.status === ApiResponse.ERROR) {
      showErrorToast(response?.data?.getMappedContactLists?.message);
      return null;
    }
  } catch (error: any) {
    showErrorToast(ApiResponse.ERROR);
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};

export const syncAllContactsByCompanyId = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation SyncAllContactsByCompanyId($companyId: Float!) {
          syncAllContactsByCompanyId(company_id: $companyId) {
            data {
              mapped
              total
              unmapped
            }
            message
            status
          }
        }
      `,
      variables: data,
      fetchPolicy: "no-cache",
    });
    const res = response?.data?.syncAllContactsByCompanyId;
    if (res?.status === ApiResponse.XERO_REFRESH && res?.message) {
      window.open(res.message, "_self");
      return null; // stop further flow
    }
    if (res?.status === ApiResponse.SUCCESS) {
      showSuccessToast(res.message);
      return res?.data;
    }
    if (res?.status === ApiResponse.ERROR) {
      showErrorToast(res.message);
      return null;
    }
  } catch (error: any) {
    showErrorToast(ApiResponse.ERROR);
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};

export const getContactByContactId = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query GetContactByContactId($companyId: Float!, $contactId: String!) {
          getContactByContactId(
            company_id: $companyId
            contact_id: $contactId
          ) {
            message
            status
          }
        }
      `,
      variables: data,
      fetchPolicy: "no-cache",
    });
    const res = response?.data?.getContactByContactId;

    // 🚀 Handle Xero reauthorization redirect if backend signals it
    if (res?.status === "XERO_REFRESH" && res?.message) {
      window.open(res.message, "_self");
      return null;
    }
    // ✅ Return the actual result or empty array
    return res || [];
  } catch (error: any) {
    showErrorToast(ApiResponse.ERROR);
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};

export const manualMappingContact = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation ManualMappingContact($payload: YetToMapContactsInput!) {
          manualMappingContact(payload: $payload) {
            message
            status
          }
        }
      `,
      variables: data,
      fetchPolicy: "no-cache",
    });
    if (response?.data?.manualMappingContact?.status === ApiResponse.SUCCESS) {
      showSuccessToast(response?.data?.manualMappingContact.message);
      return true;
    }
    if (response?.data?.manualMappingContact?.status === ApiResponse.ERROR) {
      showErrorToast(response?.data?.manualMappingContact.message);
      return null;
    }
  } catch (error: any) {
    showErrorToast(ApiResponse.ERROR);
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};

export const manualMappingContract = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation ManualMappingContract($payload: YetToMapContractsInput!) {
          manualMappingContract(payload: $payload) {
            message
            status
          }
        }
      `,
      variables: data,
      fetchPolicy: "no-cache",
    });
    if (response?.data?.manualMappingContract?.status === ApiResponse.SUCCESS) {
      showSuccessToast(response?.data?.manualMappingContract.message);
      return true;
    }
    if (response?.data?.manualMappingContract?.status === ApiResponse.ERROR) {
      showErrorToast(response?.data?.manualMappingContract.message);
      return null;
    }
  } catch (error: any) {
    showErrorToast(ApiResponse.ERROR);
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};

export const autoMappingContact = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation AutoMappingContact($companyId: Float!) {
          autoMappingContact(company_id: $companyId) {
            message
            status
            data {
              unmapped
              total
              mapped
            }
          }
        }
      `,
      variables: data,
      fetchPolicy: "no-cache",
    });
    if (response?.data?.autoMappingContact?.status === ApiResponse.SUCCESS) {
      showSuccessToast(response?.data?.autoMappingContact.message);
      return response?.data?.autoMappingContact?.data;
    }
    if (response?.data?.autoMappingContact?.status === ApiResponse.ERROR) {
      showErrorToast(response?.data?.autoMappingContact.message);
      return response?.data?.autoMappingContact?.data;
    }
  } catch (error: any) {
    showErrorToast(ApiResponse.ERROR);
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};

export const unMappingContact = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation UnMappingContact($contactId: String!) {
          unMappingContact(contact_id: $contactId) {
            message
            status
          }
        }
      `,
      variables: data,
      fetchPolicy: "no-cache",
    });
    if (response?.data?.unMappingContact?.status === ApiResponse.SUCCESS) {
      showSuccessToast(response?.data?.unMappingContact.message);
      return true;
    }
    if (response?.data?.unMappingContact?.status === ApiResponse.ERROR) {
      showErrorToast(response?.data?.unMappingContact.message);
      return null;
    }
  } catch (error: any) {
    showErrorToast(ApiResponse.ERROR);
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};

export const unMappingContract = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation UnMappingContract($contractId: String!) {
          unMappingContract(contract_id: $contractId) {
            message
            status
          }
        }
      `,
      variables: data,
      fetchPolicy: "no-cache",
    });
    if (response?.data?.unMappingContract?.status === ApiResponse.SUCCESS) {
      showSuccessToast(response?.data?.unMappingContract.message);
      return true;
    }
    if (response?.data?.unMappingContract?.status === ApiResponse.ERROR) {
      showErrorToast(response?.data?.unMappingContract.message);
      return null;
    }
  } catch (error: any) {
    showErrorToast(ApiResponse.ERROR);
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};

export async function fetchClientSuppliersList(
  postData: any,
  setLoading?: Function
): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        query GetPaytradeContactListsForCompany(
          $payload: GetPaytradeContactListsInput!
        ) {
          getPaytradeContactListsForCompany(payload: $payload) {
            data {
              contact_list {
                contact_id
                contact_name
                contact_status
                id
                mapped_status
                xero_contact_id
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
      response?.data?.getPaytradeContactListsForCompany?.status ===
      ApiResponse.SUCCESS
    ) {
      return response?.data?.getPaytradeContactListsForCompany?.data;
    }
    if (
      response?.data?.getPaytradeContactListsForCompany?.status ===
      ApiResponse.ERROR
    ) {
      console.error(response?.data?.getPaytradeContactListsForCompany?.message);
      showErrorToast(
        response?.data?.getPaytradeContactListsForCompany?.message
      );
      return null;
    }
  } catch (error: any) {
    showErrorToast(error);
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
}

export async function CreateContactInXero(
  postData: any,
  setLoading?: Function
): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation CreateContactInXero($clientSupplierId: Float!) {
          createContactInXero(client_supplier_id: $clientSupplierId) {
            data {
              mapped_status
              contact_status
              id
              contact_id
              contact_name
            }
            message
            status
          }
        }
      `,
      variables: postData,
      fetchPolicy: "no-cache",
    });
    const res = response?.data?.createContactInXero;
    if (res?.status === ApiResponse.XERO_REFRESH && res?.message) {
      window.open(res.message, "_self");
      return null; // stop further flow
    }
    if (res?.status === ApiResponse.SUCCESS) {
      showSuccessToast(res?.message);
      setLoading && setLoading(false);
    } else {
      showErrorToast(res?.message);
      setLoading && setLoading(false);
    }
  } catch (error: any) {
    showErrorToast(error);
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
}

export async function CreateContactInPaytrade(
  postData: any,
  setLoading?: Function
): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation CreateContactInPaytrade(
          $companyId: Float!
          $contactId: String!
        ) {
          createContactInPaytrade(
            company_id: $companyId
            contact_id: $contactId
          ) {
            data {
              contact_id
              contact_name
              contact_status
              id
              mapped_status
              xero_contact_id
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
      response?.data?.createContactInPaytrade?.status === ApiResponse.SUCCESS
    ) {
      showSuccessToast(response?.data?.createContactInPaytrade?.message);
      setLoading && setLoading(false);
    } else {
      showErrorToast(response?.data?.createContactInPaytrade?.message);
      setLoading && setLoading(false);
    }
  } catch (error: any) {
    showErrorToast(error);
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
}

export async function BatchCreateContactsInPaytrade(
  postData: any,
  setLoading?: Function
): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation BatchCreateContactsInPaytrade($companyId: Float!) {
          batchCreateContactsInPaytrade(company_id: $companyId) {
            data {
              created
              skipped
              failed
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
      response?.data?.batchCreateContactsInPaytrade?.status ===
      ApiResponse.SUCCESS
    ) {
      showSuccessToast(
        response?.data?.batchCreateContactsInPaytrade?.message
      );
    } else {
      showErrorToast(
        response?.data?.batchCreateContactsInPaytrade?.message
      );
    }
  } catch (error: any) {
    showErrorToast(error);
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
}

export async function BatchCreateContactsInXero(
  postData: any,
  setLoading?: Function
): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation BatchCreateContactsInXero($companyId: Float!) {
          batchCreateContactsInXero(company_id: $companyId) {
            data {
              created
              skipped
              failed
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
      response?.data?.batchCreateContactsInXero?.status ===
      ApiResponse.SUCCESS
    ) {
      showSuccessToast(response?.data?.batchCreateContactsInXero?.message);
    } else {
      showErrorToast(response?.data?.batchCreateContactsInXero?.message);
    }
  } catch (error: any) {
    showErrorToast(error);
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
}

export const syncAllProjectsByCompanyId = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation SyncAllProjectsByCompanyId($companyId: Float!) {
          syncAllProjectsByCompanyId(company_id: $companyId) {
            data {
              mapped
              total
              unmapped
            }
            message
            status
          }
        }
      `,
      variables: data,
      fetchPolicy: "no-cache",
    });
    const res = response?.data?.syncAllProjectsByCompanyId;
    if (res?.status === ApiResponse.SUCCESS) {
      showSuccessToast(res.message);
      return res?.data;
    }
    if (res?.status === ApiResponse.ERROR) {
      showErrorToast(res.message);
      return null;
    }
  } catch (error: any) {
    showErrorToast(ApiResponse.ERROR);
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};

export const getXeroProjectListsForCompany = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query GetXeroProjectListsForCompany(
          $payload: GetXeroProjectListsInput!
        ) {
          getXeroProjectListsForCompany(payload: $payload) {
            message
            status
            data {
              project_list {
                id
                mapped_status
                project_id
                project_name
                project_status
                pt_project_id
                pt_project_name
                tenant_id
              }
              total_count
            }
          }
        }
      `,
      variables: data,
      fetchPolicy: "no-cache",
    });
    if (
      response?.data?.getXeroProjectListsForCompany?.status ===
      ApiResponse.SUCCESS
    ) {
      return response?.data?.getXeroProjectListsForCompany?.data || [];
    }
    if (
      response?.data?.getXeroProjectListsForCompany?.status ===
      ApiResponse.ERROR
    ) {
      showErrorToast(response?.data?.getXeroProjectListsForCompany?.message);
      return null;
    }
  } catch (error: any) {
    showErrorToast(ApiResponse.ERROR);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};

export async function GetPaytradeProjectListsForCompany(
  postData: any,
  setLoading?: Function
): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        query GetPaytradeProjectListsForCompany(
          $payload: GetPaytradeProjectListsInput!
        ) {
          getPaytradeProjectListsForCompany(payload: $payload) {
            data {
              project_list {
                id
                mapped_status
                project_id
                project_name
                project_status
                xero_project_id
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
      response?.data?.getPaytradeProjectListsForCompany?.status ===
      ApiResponse.SUCCESS
    ) {
      return response?.data?.getPaytradeProjectListsForCompany?.data;
    }
    if (
      response?.data?.getPaytradeProjectListsForCompany?.status ===
      ApiResponse.ERROR
    ) {
      console.error(response?.data?.getPaytradeProjectListsForCompany?.message);
      showErrorToast(
        response?.data?.getPaytradeProjectListsForCompany?.message
      );
      return null;
    }
  } catch (error: any) {
    showErrorToast(error);
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
}

export const getMappedProjectLists = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query GetMappedProjectLists($payload: GetMappedXeroProjectListsInput!) {
          getMappedProjectLists(payload: $payload) {
            data {
              project_list {
                id
                mapped_status
                project_id
                project_name
                project_status
                pt_project_id
                pt_project_name
                tenant_id
              }
              total_count
            }
            message
            status
          }
        }
      `,
      variables: data,
      fetchPolicy: "no-cache",
    });
    if (response?.data?.getMappedProjectLists?.status === ApiResponse.SUCCESS) {
      return response?.data?.getMappedProjectLists?.data || [];
    }
    if (response?.data?.getMappedProjectLists?.status === ApiResponse.ERROR) {
      showErrorToast(response?.data?.getMappedProjectLists?.message);
      return null;
    }
  } catch (error: any) {
    showErrorToast(ApiResponse.ERROR);
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};

export const autoMappingProject = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation AutoMappingProject($companyId: Float!) {
          autoMappingProject(company_id: $companyId) {
            message
            status
            data {
              unmapped
              total
              mapped
            }
          }
        }
      `,
      variables: data,
      fetchPolicy: "no-cache",
    });
    if (response?.data?.autoMappingProject?.status === ApiResponse.SUCCESS) {
      showSuccessToast(response?.data?.autoMappingProject.message);
      return response?.data?.autoMappingProject?.data;
    }
    if (response?.data?.autoMappingProject?.status === ApiResponse.ERROR) {
      showErrorToast(response?.data?.autoMappingProject.message);
      return response?.data?.autoMappingProject?.data;
    }
  } catch (error: any) {
    showErrorToast(ApiResponse.ERROR);
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};

export const unMappingProject = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation UnMappingProject($projectId: String!) {
          unMappingProject(project_id: $projectId) {
            message
            status
          }
        }
      `,
      variables: data,
      fetchPolicy: "no-cache",
    });
    if (response?.data?.unMappingProject?.status === ApiResponse.SUCCESS) {
      showSuccessToast(response?.data?.unMappingProject.message);
      return true;
    }
    if (response?.data?.unMappingProject?.status === ApiResponse.ERROR) {
      showErrorToast(response?.data?.unMappingProject.message);
      return null;
    }
  } catch (error: any) {
    showErrorToast(ApiResponse.ERROR);
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};

export const manualMappingProject = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation ManualMappingProject($payload: YetToMapProjectsInput!) {
          manualMappingProject(payload: $payload) {
            message
            status
          }
        }
      `,
      variables: data,
      fetchPolicy: "no-cache",
    });
    if (response?.data?.manualMappingProject?.status === ApiResponse.SUCCESS) {
      showSuccessToast(response?.data?.manualMappingProject.message);
      return true;
    }
    if (response?.data?.manualMappingProject?.status === ApiResponse.ERROR) {
      showErrorToast(response?.data?.manualMappingProject.message);
      return null;
    }
  } catch (error: any) {
    showErrorToast(ApiResponse.ERROR);
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};

export const getXeroContractsListsForCompany = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query GetXeroContractListsForCompany(
          $payload: GetXeroContractListsInput!
        ) {
          getXeroContractListsForCompany(payload: $payload) {
            data {
              contract_list {
                contract_id
                contract_name
                contract_status
                id
                mapped_status
                pt_contract_id
                pt_contract_name
                tenant_id
              }
              total_count
            }
            message
            status
          }
        }
      `,
      variables: data,
      fetchPolicy: "no-cache",
    });
    if (
      response?.data?.getXeroContractListsForCompany?.status ===
      ApiResponse.SUCCESS
    ) {
      return response?.data?.getXeroContractListsForCompany?.data || [];
    }
    if (
      response?.data?.getXeroContractListsForCompany?.status ===
      ApiResponse.ERROR
    ) {
      showErrorToast(response?.data?.getXeroContractListsForCompany?.message);
      return null;
    }
  } catch (error: any) {
    showErrorToast(ApiResponse.ERROR);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};

export const getPaytradeContractListsForCompany = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query GetPaytradeContractListsForCompany(
          $payload: GetPaytradeContractListsInput!
        ) {
          getPaytradeContractListsForCompany(payload: $payload) {
            data {
              contract_list {
                contract_id
                contract_name
                contract_status
                id
                mapped_status
                xero_contract_id
              }
              total_count
            }
            message
            status
          }
        }
      `,
      variables: data,
      fetchPolicy: "no-cache",
    });
    if (
      response?.data?.getPaytradeContractListsForCompany?.status ===
      ApiResponse.SUCCESS
    ) {
      return response?.data?.getPaytradeContractListsForCompany?.data || [];
    }
    if (
      response?.data?.getPaytradeContractListsForCompany?.status ===
      ApiResponse.ERROR
    ) {
      showErrorToast(
        response?.data?.getPaytradeContractListsForCompany?.message
      );
      return null;
    }
  } catch (error: any) {
    showErrorToast(ApiResponse.ERROR);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};

export const getMappedContractLists = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query GetMappedContractLists(
          $payload: GetMappedXeroContractListsInput!
        ) {
          getMappedContractLists(payload: $payload) {
            data {
              contract_list {
                contract_id
                contract_name
                contract_status
                id
                mapped_status
                pt_contract_id
                pt_contract_name
                tenant_id
              }
              total_count
            }
            message
            status
          }
        }
      `,
      variables: data,
      fetchPolicy: "no-cache",
    });
    if (
      response?.data?.getMappedContractLists?.status === ApiResponse.SUCCESS
    ) {
      return response?.data?.getMappedContractLists?.data || [];
    }
    if (response?.data?.getMappedContractLists?.status === ApiResponse.ERROR) {
      showErrorToast(response?.data?.getMappedContractLists?.message);
      return null;
    }
  } catch (error: any) {
    showErrorToast(ApiResponse.ERROR);
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};

export const syncAllContractsByCompanyId = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation SyncAllContractsByCompanyId($companyId: Float!) {
          syncAllContractsByCompanyId(company_id: $companyId) {
            data {
              mapped
              total
              unmapped
            }
            message
            status
          }
        }
      `,
      variables: data,
      fetchPolicy: "no-cache",
    });
    const res = response?.data?.syncAllContractsByCompanyId;

    if (res?.status === ApiResponse.XERO_REFRESH && res?.message) {
      window.open(res?.message, "_self");
      return null; // stop further flow
    }
    if (res?.status === ApiResponse.SUCCESS) {
      showSuccessToast(res?.message);
      return res?.data;
    }
    if (res?.status === ApiResponse.ERROR) {
      showErrorToast(res?.message);
      return null;
    }
  } catch (error: any) {
    showErrorToast(ApiResponse.ERROR);
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};

export const autoMappingContract = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation AutoMappingContract($companyId: Float!) {
          autoMappingContract(company_id: $companyId) {
            message
            status
            data {
              unmapped
              total
              mapped
            }
          }
        }
      `,
      variables: data,
      fetchPolicy: "no-cache",
    });
    if (response?.data?.autoMappingContract?.status === ApiResponse.SUCCESS) {
      showSuccessToast(response?.data?.autoMappingContract.message);
      return response?.data?.autoMappingContract?.data;
    }
    if (response?.data?.autoMappingContract?.status === ApiResponse.ERROR) {
      showErrorToast(response?.data?.autoMappingContract.message);
      return response?.data?.autoMappingContract?.data;
    }
  } catch (error: any) {
    showErrorToast(ApiResponse.ERROR);
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};

export async function CreateContractInXero(
  postData: any,
  setLoading?: Function
): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation CreateContractInXero($contractId: Float!) {
          createContractInXero(contract_id: $contractId) {
            message
            status
          }
        }
      `,
      variables: postData,
      fetchPolicy: "no-cache",
    });
    const res = response?.data?.createContractInXero;
    if (res?.status === ApiResponse.XERO_REFRESH && res?.message) {
      window.open(res.message, "_self");
      return null; // stop further flow
    }
    if (res?.status === ApiResponse.SUCCESS) {
      showSuccessToast(res?.message);
      setLoading && setLoading(false);
    } else {
      showErrorToast(res?.message);
      setLoading && setLoading(false);
    }
  } catch (error: any) {
    showErrorToast(error);
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
}

export async function CreateContractInPaytrade(
  postData: any,
  setLoading?: Function
): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation CreateContractInPaytrade(
          $companyId: Float!
          $contractId: String!
        ) {
          createContractInPaytrade(
            company_id: $companyId
            contract_id: $contractId
          ) {
            message
            status
          }
        }
      `,
      variables: postData,
      fetchPolicy: "no-cache",
    });

    if (
      response?.data?.createContractInPaytrade?.status === ApiResponse.SUCCESS
    ) {
      showSuccessToast(response?.data?.createContractInPaytrade?.message);
      setLoading && setLoading(false);
    } else {
      showErrorToast(response?.data?.createContractInPaytrade?.message);
      setLoading && setLoading(false);
    }
  } catch (error: any) {
    showErrorToast(error);
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
}

export async function CreateProjectInXero(
  postData: any,
  setLoading?: Function
): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation CreateProjectInXero($projectId: Float!) {
          createProjectInXero(project_id: $projectId) {
            message
            status
          }
        }
      `,
      variables: postData,
      fetchPolicy: "no-cache",
    });
    const res = response?.data?.createProjectInXero;

    if (res?.status === ApiResponse.XERO_REFRESH && res?.message) {
      window.open(res.message, "_self");
      return null; // stop further flow
    }

    if (res?.status === ApiResponse.SUCCESS) {
      showSuccessToast(res?.message);
      setLoading && setLoading(false);
    } else {
      showErrorToast(res?.message);
      setLoading && setLoading(false);
    }
  } catch (error: any) {
    showErrorToast(error);
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
}

export async function CreateProjectInPaytrade(
  postData: any,
  setLoading?: Function
): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation CreateProjectInPaytrade(
          $companyId: Float!
          $projectId: String!
        ) {
          createProjectInPaytrade(
            company_id: $companyId
            project_id: $projectId
          ) {
            message
            status
          }
        }
      `,
      variables: postData,
      fetchPolicy: "no-cache",
    });

    if (
      response?.data?.createProjectInPaytrade?.status === ApiResponse.SUCCESS
    ) {
      showSuccessToast(response?.data?.createProjectInPaytrade?.message);
      setLoading && setLoading(false);
    } else {
      showErrorToast(response?.data?.createProjectInPaytrade?.message);
      setLoading && setLoading(false);
    }
  } catch (error: any) {
    showErrorToast(error);
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
}

export const autoMappingBankAccounts = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation AutoMappingAccount($companyId: Float!) {
          autoMappingAccount(company_id: $companyId) {
            message
            status
            data {
              unmapped
              total
              mapped
            }
          }
        }
      `,
      variables: data,
      fetchPolicy: "no-cache",
    });
    if (response?.data?.autoMappingAccount?.status === ApiResponse.SUCCESS) {
      showSuccessToast(response?.data?.autoMappingAccount.message);
      return response?.data?.autoMappingAccount?.data;
    }
    if (response?.data?.autoMappingAccount?.status === ApiResponse.ERROR) {
      showErrorToast(response?.data?.autoMappingAccount.message);
      return response?.data?.autoMappingAccount?.data;
    }
  } catch (error: any) {
    showErrorToast(ApiResponse.ERROR);
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};
export const autoMappingBills = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation AutoMappingInvoice($companyId: Float!) {
          autoMappingInvoice(company_id: $companyId) {
            data {
              mapped
              total
              unmapped
            }
            message
            status
          }
        }
      `,
      variables: data,
      fetchPolicy: "no-cache",
    });
    if (response?.data?.autoMappingInvoice?.status === ApiResponse.SUCCESS) {
      showSuccessToast(response?.data?.autoMappingInvoice.message);
      return response?.data?.autoMappingInvoice?.data;
    }
    if (response?.data?.autoMappingInvoice?.status === ApiResponse.ERROR) {
      showErrorToast(response?.data?.autoMappingInvoice.message);
      return response?.data?.autoMappingInvoice?.data;
    }
  } catch (error: any) {
    showErrorToast(ApiResponse.ERROR);
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};
export const autoMappingInvoices = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation AutoMappingInvoice($companyId: Float!) {
          autoMappingInvoice(company_id: $companyId) {
            data {
              mapped
              total
              unmapped
            }
            message
            status
          }
        }
      `,
      variables: data,
      fetchPolicy: "no-cache",
    });
    if (response?.data?.autoMappingInvoice?.status === ApiResponse.SUCCESS) {
      showSuccessToast(response?.data?.autoMappingInvoice.message);
      return response?.data?.autoMappingInvoice?.data;
    }
    if (response?.data?.autoMappingInvoice?.status === ApiResponse.ERROR) {
      showErrorToast(response?.data?.autoMappingInvoice.message);
      return response?.data?.autoMappingInvoice?.data;
    }
  } catch (error: any) {
    showErrorToast(ApiResponse.ERROR);
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};
export const autoMappingPayments = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation AutoMappingInvoice($companyId: Float!) {
          autoMappingInvoice(company_id: $companyId) {
            data {
              mapped
              total
              unmapped
            }
            message
            status
          }
        }
      `,
      variables: data,
      fetchPolicy: "no-cache",
    });
    if (response?.data?.autoMappingInvoice?.status === ApiResponse.SUCCESS) {
      showSuccessToast(response?.data?.autoMappingInvoice.message);
      return response?.data?.autoMappingInvoice?.data;
    }
    if (response?.data?.autoMappingInvoice?.status === ApiResponse.ERROR) {
      showErrorToast(response?.data?.autoMappingInvoice.message);
      return response?.data?.autoMappingInvoice?.data;
    }
  } catch (error: any) {
    showErrorToast(ApiResponse.ERROR);
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};
export async function GetPaytradeBankAccountsListsForCompany(
  postData: any,
  setLoading?: Function
): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        query GetPaytradeAccountListsForCompany(
          $payload: GetPaytradeAccountListsInput!
        ) {
          getPaytradeAccountListsForCompany(payload: $payload) {
            data {
              account_list {
                account_id
                account_name
                account_number
                account_status
                description
                id
                mapped_status
                xero_bank_account_id
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
      response?.data?.getPaytradeAccountListsForCompany?.status ===
      ApiResponse.SUCCESS
    ) {
      return response?.data?.getPaytradeAccountListsForCompany?.data;
    }
    if (
      response?.data?.getPaytradeAccountListsForCompany?.status ===
      ApiResponse.ERROR
    ) {
      console.error(response?.data?.getPaytradeAccountListsForCompany?.message);
      showErrorToast(
        response?.data?.getPaytradeAccountListsForCompany?.message
      );
      return null;
    }
  } catch (error: any) {
    showErrorToast(error);
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
}
export async function GetPaytradeBillsListsForCompany(
  postData: any,
  setLoading?: Function
): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        query Data($payload: GetPaytradeInvoicesListsInput!) {
          getPaytradeInvoiceListsForCompany(payload: $payload) {
            data {
              invoice_list {
                contact_id
                contact_name
                due_date
                id
                invoice_id
                mapped_status
                status
                total_amount
                type
                xero_invoice_id
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
      response?.data?.getPaytradeInvoiceListsForCompany?.status ===
      ApiResponse.SUCCESS
    ) {
      return response?.data?.getPaytradeInvoiceListsForCompany?.data;
    }
    if (
      response?.data?.getPaytradeInvoiceListsForCompany?.status ===
      ApiResponse.ERROR
    ) {
      console.error(response?.data?.getPaytradeInvoiceListsForCompany?.message);
      showErrorToast(
        response?.data?.getPaytradeInvoiceListsForCompany?.message
      );
      return null;
    }
  } catch (error: any) {
    showErrorToast(error);
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
}

export async function GetPaytradeInvoicesListsForCompany(
  postData: any,
  setLoading?: Function
): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        query GetPaytradeInvoiceListsForCompany(
          $payload: GetPaytradeInvoicesListsInput!
        ) {
          getPaytradeInvoiceListsForCompany(payload: $payload) {
            data {
              invoice_list {
                contact_id
                contact_name
                due_date
                id
                invoice_id
                mapped_status
                status
                total_amount
                type
                xero_invoice_id
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
      response?.data?.getPaytradeInvoiceListsForCompany?.status ===
      ApiResponse.SUCCESS
    ) {
      return response?.data?.getPaytradeInvoiceListsForCompany?.data;
    }
    if (
      response?.data?.getPaytradeInvoiceListsForCompany?.status ===
      ApiResponse.ERROR
    ) {
      console.error(response?.data?.getPaytradeInvoiceListsForCompany?.message);
      showErrorToast(
        response?.data?.getPaytradeInvoiceListsForCompany?.message
      );
      return null;
    }
  } catch (error: any) {
    showErrorToast(error);
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
}

export async function GetPaytradePaymentsListsForCompany(
  postData: any,
  setLoading?: Function
): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        query GetPaytradePaymentListsForCompany(
          $payload: GetPaytradePaymentListsInput!
        ) {
          getPaytradePaymentListsForCompany(payload: $payload) {
            data {
              payment_list {
                account_id
                contact_id
                contact_name
                id
                invoice_id
                mapped_status
                payment_amount
                payment_date
                payment_id
                payment_type
                status
                xero_payment_id
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
      response?.data?.getPaytradePaymentListsForCompany?.status ===
      ApiResponse.SUCCESS
    ) {
      return response?.data?.getPaytradePaymentListsForCompany?.data;
    }
    if (
      response?.data?.getPaytradePaymentListsForCompany?.status ===
      ApiResponse.ERROR
    ) {
      console.error(response?.data?.getPaytradePaymentListsForCompany?.message);
      showErrorToast(
        response?.data?.getPaytradePaymentListsForCompany?.message
      );
      return null;
    }
  } catch (error: any) {
    showErrorToast(error);
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
}

export const getMappedBankAccountsLists = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query GetMappedAccountLists($payload: GetMappedXeroAccountListsInput!) {
          getMappedAccountLists(payload: $payload) {
            data {
              account_list {
                account_id
                account_name
                account_status
                id
                mapped_status
                pt_bank_account_id
                pt_account_name
                tenant_id
              }
              total_count
            }
            message
            status
          }
        }
      `,
      variables: data,
      fetchPolicy: "no-cache",
    });
    if (response?.data?.getMappedAccountLists?.status === ApiResponse.SUCCESS) {
      return response?.data?.getMappedAccountLists?.data || [];
    }
    if (response?.data?.getMappedAccountLists?.status === ApiResponse.ERROR) {
      showErrorToast(response?.data?.getMappedAccountLists?.message);
      return null;
    }
  } catch (error: any) {
    showErrorToast(ApiResponse.ERROR);
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};
export const getMappedBillsLists = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query GetMappedInvoiceBillLists(
          $payload: GetMappedXeroInvoicesListsInput!
        ) {
          getMappedInvoiceBillLists(payload: $payload) {
            data {
              invoice_list {
                contact_id
                contact_name
                due_date
                id
                invoice_id
                mapped_status
                pt_claim_id
                status
                tenant_id
                total_amount
                type
              }
              total_count
            }
            message
            status
          }
        }
      `,
      variables: data,
      fetchPolicy: "no-cache",
    });
    if (
      response?.data?.getMappedInvoiceBillLists?.status === ApiResponse.SUCCESS
    ) {
      return response?.data?.getMappedInvoiceBillLists?.data || [];
    }
    if (
      response?.data?.getMappedInvoiceBillLists?.status === ApiResponse.ERROR
    ) {
      showErrorToast(response?.data?.getMappedInvoiceBillLists?.message);
      return null;
    }
  } catch (error: any) {
    showErrorToast(ApiResponse.ERROR);
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};

export const getMappedInvoicesLists = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query GetMappedInvoiceBillLists(
          $payload: GetMappedXeroInvoicesListsInput!
        ) {
          getMappedInvoiceBillLists(payload: $payload) {
            data {
              invoice_list {
                contact_id
                contact_name
                due_date
                id
                invoice_id
                mapped_status
                pt_claim_id
                status
                tenant_id
                total_amount
                type
              }
              total_count
            }
            message
            status
          }
        }
      `,
      variables: data,
      fetchPolicy: "no-cache",
    });
    if (
      response?.data?.getMappedInvoiceBillLists?.status === ApiResponse.SUCCESS
    ) {
      return response?.data?.getMappedInvoiceBillLists?.data || [];
    }
    if (
      response?.data?.getMappedInvoiceBillLists?.status === ApiResponse.ERROR
    ) {
      showErrorToast(response?.data?.getMappedInvoiceBillLists?.message);
      return null;
    }
  } catch (error: any) {
    showErrorToast(ApiResponse.ERROR);
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};

export const getMappedPaymentsLists = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query GetMappedPaymentLists($payload: GetMappedXeroPaymentListsInput!) {
          getMappedPaymentLists(payload: $payload) {
            data {
              payment_list {
                account_id
                contact_id
                contact_name
                id
                invoice_id
                mapped_status
                payment_amount
                payment_date
                payment_id
                payment_type
                pt_payment_id
                status
                tenant_id
              }
              total_count
            }
            message
            status
          }
        }
      `,
      variables: data,
      fetchPolicy: "no-cache",
    });
    if (response?.data?.getMappedPaymentLists?.status === ApiResponse.SUCCESS) {
      return response?.data?.getMappedPaymentLists?.data || [];
    }
    if (response?.data?.getMappedPaymentLists?.status === ApiResponse.ERROR) {
      showErrorToast(response?.data?.getMappedPaymentLists?.message);
      return null;
    }
  } catch (error: any) {
    showErrorToast(ApiResponse.ERROR);
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};

export const getXeroBankAccountsListsForCompany = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query GetXeroBankAccountListsForCompany(
          $payload: GetXeroAccountListsInput!
        ) {
          getXeroBankAccountListsForCompany(payload: $payload) {
            data {
              account_list {
                account_id
                account_name
                account_status
                id
                mapped_status
                pt_bank_account_id
                pt_account_name
                tenant_id
              }
              total_count
            }
            message
            status
          }
        }
      `,
      variables: data,
      fetchPolicy: "no-cache",
    });
    if (
      response?.data?.getXeroBankAccountListsForCompany?.status ===
      ApiResponse.SUCCESS
    ) {
      return response?.data?.getXeroBankAccountListsForCompany?.data || [];
    }
    if (
      response?.data?.getXeroBankAccountListsForCompany?.status ===
      ApiResponse.ERROR
    ) {
      showErrorToast(
        response?.data?.getXeroBankAccountListsForCompany?.message
      );
      return null;
    }
  } catch (error: any) {
    showErrorToast(ApiResponse.ERROR);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};
export const getXeroBillsListsForCompany = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query GetXeroInvoiceBillListsForCompany(
          $payload: GetXeroInvoicesListsInput!
        ) {
          getXeroInvoiceBillListsForCompany(payload: $payload) {
            data {
              invoice_list {
                contact_id
                contact_name
                mapped_status
                due_date
                id
                invoice_id
                pt_claim_id
                status
                tenant_id
                total_amount
                type
              }
              total_count
            }
            message
            status
          }
        }
      `,
      variables: data,
      fetchPolicy: "no-cache",
    });
    if (
      response?.data?.getXeroInvoiceBillListsForCompany?.status ===
      ApiResponse.SUCCESS
    ) {
      return response?.data?.getXeroInvoiceBillListsForCompany?.data || [];
    }
    if (
      response?.data?.getXeroInvoiceBillListsForCompany?.status ===
      ApiResponse.ERROR
    ) {
      showErrorToast(
        response?.data?.getXeroInvoiceBillListsForCompany?.message
      );
      return null;
    }
  } catch (error: any) {
    showErrorToast(ApiResponse.ERROR);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};

export const getXeroInvoicesListsForCompany = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query GetXeroInvoiceBillListsForCompany(
          $payload: GetXeroInvoicesListsInput!
        ) {
          getXeroInvoiceBillListsForCompany(payload: $payload) {
            data {
              invoice_list {
                contact_id
                contact_name
                due_date
                id
                invoice_id
                mapped_status
                pt_claim_id
                status
                tenant_id
                total_amount
                type
              }
              total_count
            }
            message
            status
          }
        }
      `,
      variables: data,
      fetchPolicy: "no-cache",
    });
    if (
      response?.data?.getXeroInvoiceBillListsForCompany?.status ===
      ApiResponse.SUCCESS
    ) {
      return response?.data?.getXeroInvoiceBillListsForCompany?.data || [];
    }
    if (
      response?.data?.getXeroInvoiceBillListsForCompany?.status ===
      ApiResponse.ERROR
    ) {
      showErrorToast(
        response?.data?.getXeroInvoiceBillListsForCompany?.message
      );
      return null;
    }
  } catch (error: any) {
    showErrorToast(ApiResponse.ERROR);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};

export const getXeroPaymentsListsForCompany = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query GetXeroPaymentListsForCompany(
          $payload: GetXeroPaymentListsInput!
        ) {
          getXeroPaymentListsForCompany(payload: $payload) {
            data {
              payment_list {
                account_id
                contact_id
                contact_name
                id
                invoice_id
                mapped_status
                payment_amount
                payment_date
                payment_id
                payment_type
                pt_payment_id
                status
                tenant_id
              }
              total_count
            }
            message
            status
          }
        }
      `,
      variables: data,
      fetchPolicy: "no-cache",
    });
    if (
      response?.data?.getXeroPaymentListsForCompany?.status ===
      ApiResponse.SUCCESS
    ) {
      return response?.data?.getXeroPaymentListsForCompany?.data || [];
    }
    if (
      response?.data?.getXeroPaymentListsForCompany?.status ===
      ApiResponse.ERROR
    ) {
      showErrorToast(response?.data?.getXeroPaymentListsForCompany?.message);
      return null;
    }
  } catch (error: any) {
    showErrorToast(ApiResponse.ERROR);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};

export const manualMappingBankAccounts = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation ManualMappingAccount($payload: YetToMapAccountsInput!) {
          manualMappingAccount(payload: $payload) {
            message
            status
          }
        }
      `,
      variables: data,
      fetchPolicy: "no-cache",
    });
    if (response?.data?.manualMappingAccount?.status === ApiResponse.SUCCESS) {
      showSuccessToast(response?.data?.manualMappingAccount.message);
      return true;
    }
    if (response?.data?.manualMappingAccount?.status === ApiResponse.ERROR) {
      showErrorToast(response?.data?.manualMappingAccount.message);
      return null;
    }
  } catch (error: any) {
    showErrorToast(ApiResponse.ERROR);
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};
export const manualMappingBills = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation ManualMappingInvoiceBill($payload: YetToMapInvoicesInput!) {
          manualMappingInvoiceBill(payload: $payload) {
            message
            status
          }
        }
      `,
      variables: data,
      fetchPolicy: "no-cache",
    });
    if (
      response?.data?.manualMappingInvoiceBill?.status === ApiResponse.SUCCESS
    ) {
      showSuccessToast(response?.data?.manualMappingInvoiceBill.message);
      return true;
    }
    if (
      response?.data?.manualMappingInvoiceBill?.status === ApiResponse.ERROR
    ) {
      showErrorToast(response?.data?.manualMappingInvoiceBill.message);
      return null;
    }
  } catch (error: any) {
    showErrorToast(ApiResponse.ERROR);
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};

export const manualMappingInvoices = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation ManualMappingInvoiceBill($payload: YetToMapInvoicesInput!) {
          manualMappingInvoiceBill(payload: $payload) {
            message
            status
          }
        }
      `,
      variables: data,
      fetchPolicy: "no-cache",
    });
    if (
      response?.data?.manualMappingInvoiceBill?.status === ApiResponse.SUCCESS
    ) {
      showSuccessToast(response?.data?.manualMappingInvoiceBill.message);
      return true;
    }
    if (
      response?.data?.manualMappingInvoiceBill?.status === ApiResponse.ERROR
    ) {
      showErrorToast(response?.data?.manualMappingInvoiceBill.message);
      return null;
    }
  } catch (error: any) {
    showErrorToast(ApiResponse.ERROR);
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};
export const manualMappingPayments = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation ManualMappingPayment($payload: YetToMapPaymentsInput!) {
          manualMappingPayment(payload: $payload) {
            message
            status
          }
        }
      `,
      variables: data,
      fetchPolicy: "no-cache",
    });
    if (response?.data?.manualMappingPayment?.status === ApiResponse.SUCCESS) {
      showSuccessToast(response?.data?.manualMappingPayment.message);
      return true;
    }
    if (response?.data?.manualMappingPayment?.status === ApiResponse.ERROR) {
      showErrorToast(response?.data?.manualMappingPayment.message);
      return null;
    }
  } catch (error: any) {
    showErrorToast(ApiResponse.ERROR);
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};
export const syncAllBankAccountsByCompanyId = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation SyncAllBankAccountsByCompanyId($companyId: Float!) {
          syncAllBankAccountsByCompanyId(company_id: $companyId) {
            data {
              mapped
              total
              unmapped
            }
            message
            status
          }
        }
      `,
      variables: data,
      fetchPolicy: "no-cache",
    });
    const res = response?.data?.syncAllBankAccountsByCompanyId;
    if (res?.status === ApiResponse.XERO_REFRESH && res?.message) {
      window.open(res.message, "_self");
      return null; // stop further flow
    }

    if (res?.status === ApiResponse.SUCCESS) {
      showSuccessToast(res.message);
      return res?.data;
    }
    if (res?.status === ApiResponse.ERROR) {
      showErrorToast(res.message);
      return null;
    }
  } catch (error: any) {
    showErrorToast(ApiResponse.ERROR);
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};
export const syncAllBillsByCompanyId = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation SyncAllInvoicesOrBillsByCompanyId(
          $companyId: Float!
          $type: String!
        ) {
          syncAllInvoicesOrBillsByCompanyId(
            company_id: $companyId
            type: $type
          ) {
            message
            status
          }
        }
      `,
      variables: data,
      fetchPolicy: "no-cache",
    });
    const res = response?.data?.syncAllInvoicesOrBillsByCompanyId;
    if (res?.status === ApiResponse.XERO_REFRESH && res?.message) {
      window.open(res.message, "_self");
      return null; // stop further flow
    }

    if (res?.status === ApiResponse.SUCCESS) {
      showSuccessToast(res.message);
      return true;
    }
    if (res?.status === ApiResponse.ERROR) {
      showErrorToast(res.message);
      return null;
    }
  } catch (error: any) {
    showErrorToast(ApiResponse.ERROR);
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};
export const syncAllInvoicesByCompanyId = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation SyncAllInvoicesOrBillsByCompanyId(
          $companyId: Float!
          $type: String!
        ) {
          syncAllInvoicesOrBillsByCompanyId(
            company_id: $companyId
            type: $type
          ) {
            message
            status
          }
        }
      `,
      variables: data,
      fetchPolicy: "no-cache",
    });
    const res = response?.data?.syncAllInvoicesOrBillsByCompanyId;

    if (res?.status === ApiResponse.XERO_REFRESH && res?.message) {
      window.open(res.message, "_self");
      return null; // stop further flow
    }

    if (res?.status === ApiResponse.SUCCESS) {
      showSuccessToast(res.message);
      return true;
    }
    if (res?.status === ApiResponse.ERROR) {
      showErrorToast(res.message);
      return null;
    }
  } catch (error: any) {
    showErrorToast(ApiResponse.ERROR);
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};
export const syncAllPaymentsByCompanyId = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation SyncAllPaymentsByCompanyId($companyId: Float!) {
          syncAllPaymentsByCompanyId(company_id: $companyId) {
            message
            status
          }
        }
      `,
      variables: data,
      fetchPolicy: "no-cache",
    });
    const res = response?.data?.syncAllInvoicesOrBillsByCompanyId;
    if (res?.status === ApiResponse.XERO_REFRESH && res?.message) {
      window.open(res.message, "_self");
      return null; // stop further flow
    }

    if (res?.status === ApiResponse.SUCCESS) {
      showSuccessToast(res.message);
      return true;
    }
    if (res?.status === ApiResponse.ERROR) {
      showErrorToast(res.message);
      return null;
    }
  } catch (error: any) {
    showErrorToast(ApiResponse.ERROR);
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};
export const unMappingBankAccounts = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation UnMappingAccount($accountId: String!) {
          unMappingAccount(account_id: $accountId) {
            message
            status
          }
        }
      `,
      variables: data,
      fetchPolicy: "no-cache",
    });
    if (response?.data?.unMappingAccount?.status === ApiResponse.SUCCESS) {
      showSuccessToast(response?.data?.unMappingAccount.message);
      return true;
    }
    if (response?.data?.unMappingAccount?.status === ApiResponse.ERROR) {
      showErrorToast(response?.data?.unMappingAccount.message);
      return null;
    }
  } catch (error: any) {
    showErrorToast(ApiResponse.ERROR);
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};
export const unMappingBills = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation UnMappingInvoiceBill($invoiceId: String!) {
          unMappingInvoiceBill(invoice_id: $invoiceId) {
            message
            status
          }
        }
      `,
      variables: data,
      fetchPolicy: "no-cache",
    });
    if (response?.data?.UnMappingInvoiceBill?.status === ApiResponse.SUCCESS) {
      showSuccessToast(response?.data?.UnMappingInvoiceBill.message);
      return true;
    }
    if (response?.data?.UnMappingInvoiceBill?.status === ApiResponse.ERROR) {
      showErrorToast(response?.data?.UnMappingInvoiceBill.message);
      return null;
    }
  } catch (error: any) {
    showErrorToast(ApiResponse.ERROR);
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};
export const unMappingInvoices = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation UnMappingInvoiceBill($invoiceId: String!) {
          unMappingInvoiceBill(invoice_id: $invoiceId) {
            message
            status
          }
        }
      `,
      variables: data,
      fetchPolicy: "no-cache",
    });
    if (response?.data?.UnMappingInvoiceBill?.status === ApiResponse.SUCCESS) {
      showSuccessToast(response?.data?.UnMappingInvoiceBill.message);
      return true;
    }
    if (response?.data?.UnMappingInvoiceBill?.status === ApiResponse.ERROR) {
      showErrorToast(response?.data?.UnMappingInvoiceBill.message);
      return null;
    }
  } catch (error: any) {
    showErrorToast(ApiResponse.ERROR);
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};
export const unMappingPayments = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation UnMappingPayment($paymentId: String!) {
          unMappingPayment(payment_id: $paymentId) {
            message
            status
          }
        }
      `,
      variables: data,
      fetchPolicy: "no-cache",
    });
    if (response?.data?.unMappingPayment?.status === ApiResponse.SUCCESS) {
      showSuccessToast(response?.data?.unMappingPayment.message);
      return true;
    }
    if (response?.data?.unMappingPayment?.status === ApiResponse.ERROR) {
      showErrorToast(response?.data?.unMappingPayment.message);
      return null;
    }
  } catch (error: any) {
    showErrorToast(ApiResponse.ERROR);
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};
export async function CreateBankAccountsInPaytrade(
  postData: any,
  setLoading?: Function
): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation CreateAccountInPaytrade(
          $accountId: String!
          $companyId: Float!
        ) {
          createAccountInPaytrade(
            account_id: $accountId
            company_id: $companyId
          ) {
            message
            status
          }
        }
      `,
      variables: postData,
      fetchPolicy: "no-cache",
    });

    if (
      response?.data?.createAccountInPaytrade?.status === ApiResponse.SUCCESS
    ) {
      showSuccessToast(response?.data?.createAccountInPaytrade?.message);
      setLoading && setLoading(false);
    } else {
      showErrorToast(response?.data?.createAccountInPaytrade?.message);
      setLoading && setLoading(false);
    }
  } catch (error: any) {
    showErrorToast(error);
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
}
export async function completeBankAccountDraft(
  postData: any,
  setLoading?: Function
): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation CompleteBankAccountDraft(
          $input: CompleteBankAccountDraftInput!
        ) {
          completeBankAccountDraft(input: $input) {
            message
            status
          }
        }
      `,
      variables: { input: postData },
      fetchPolicy: "no-cache",
    });

    if (
      response?.data?.completeBankAccountDraft?.status === ApiResponse.SUCCESS
    ) {
      showSuccessToast(response?.data?.completeBankAccountDraft?.message);
      return true;
    } else {
      showErrorToast(response?.data?.completeBankAccountDraft?.message);
      return null;
    }
  } catch (error: any) {
    showErrorToast(error);
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
}
export async function CreateBillsInPaytrade(
  postData: any,
  setLoading?: Function
): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation CreateInvoiceOrBillInPaytrade(
          $companyId: Float!
          $invoiceId: String!
        ) {
          createInvoiceOrBillInPaytrade(
            company_id: $companyId
            invoice_id: $invoiceId
          ) {
            message
            status
          }
        }
      `,
      variables: postData,
      fetchPolicy: "no-cache",
    });

    if (
      response?.data?.createInvoiceOrBillInPaytrade?.status ===
      ApiResponse.SUCCESS
    ) {
      showSuccessToast(response?.data?.createInvoiceOrBillInPaytrade?.message);
      setLoading && setLoading(false);
    } else {
      showErrorToast(response?.data?.createInvoiceOrBillInPaytrade?.message);
      setLoading && setLoading(false);
    }
  } catch (error: any) {
    showErrorToast(error);
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
}

export async function CreateInvoicesInPaytrade(
  postData: any,
  setLoading?: Function
): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation CreateInvoiceOrBillInPaytrade(
          $companyId: Float!
          $invoiceId: String!
        ) {
          createInvoiceOrBillInPaytrade(
            company_id: $companyId
            invoice_id: $invoiceId
          ) {
            message
            status
          }
        }
      `,
      variables: postData,
      fetchPolicy: "no-cache",
    });

    if (
      response?.data?.createInvoiceOrBillInPaytrade?.status ===
      ApiResponse.SUCCESS
    ) {
      showSuccessToast(response?.data?.createInvoiceOrBillInPaytrade?.message);
      setLoading && setLoading(false);
    } else {
      showErrorToast(response?.data?.createInvoiceOrBillInPaytrade?.message);
      setLoading && setLoading(false);
    }
  } catch (error: any) {
    showErrorToast(error);
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
}

export async function CreatePaymentsInPaytrade(
  postData: any,
  setLoading?: Function
): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation CreateInvoiceOrBillInPaytrade(
          $companyId: Float!
          $invoiceId: String!
        ) {
          createInvoiceOrBillInPaytrade(
            company_id: $companyId
            invoice_id: $invoiceId
          ) {
            message
            status
          }
        }
      `,
      variables: postData,
      fetchPolicy: "no-cache",
    });

    if (
      response?.data?.createInvoiceOrBillInPaytrade?.status ===
      ApiResponse.SUCCESS
    ) {
      showSuccessToast(response?.data?.createInvoiceOrBillInPaytrade?.message);
      setLoading && setLoading(false);
    } else {
      showErrorToast(response?.data?.createInvoiceOrBillInPaytrade?.message);
      setLoading && setLoading(false);
    }
  } catch (error: any) {
    showErrorToast(error);
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
}

export async function CreateBankAccountsInXero(
  postData: any,
  setLoading?: Function
): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation CreateAccountInXero($bankAccountId: Float!) {
          createAccountInXero(bank_account_id: $bankAccountId) {
            message
            status
          }
        }
      `,
      variables: postData,
      fetchPolicy: "no-cache",
    });

    const res = response?.data?.createAccountInXero;
    if (res?.status === ApiResponse.XERO_REFRESH && res?.message) {
      window.open(res.message, "_self");
      return null; // stop further flow
    }

    if (res?.status === ApiResponse.SUCCESS) {
      showSuccessToast(res?.message);
      setLoading && setLoading(false);
    } else {
      showErrorToast(res?.message);
      setLoading && setLoading(false);
    }
  } catch (error: any) {
    showErrorToast(error);
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
}
export async function CreateBillsInXero(
  postData: any,
  setLoading?: Function
): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation CreateInvoiceOrBillInXero($paymentClaimId: Float!) {
          createInvoiceOrBillInXero(payment_claim_id: $paymentClaimId) {
            message
            status
          }
        }
      `,
      variables: postData,
      fetchPolicy: "no-cache",
    });
    const res = response?.data?.createInvoiceOrBillInXero;
    if (res?.status === ApiResponse.XERO_REFRESH && res?.message) {
      window.open(res.message, "_self");
      return null; // stop further flow
    }
    if (res?.status === ApiResponse.SUCCESS) {
      showSuccessToast(res?.message);
      setLoading && setLoading(false);
    } else {
      showErrorToast(res?.message);
      setLoading && setLoading(false);
    }
  } catch (error: any) {
    showErrorToast(error);
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
}
export async function CreateInvoicesInXero(
  postData: any,
  setLoading?: Function
): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation CreateInvoiceOrBillInXero($paymentClaimId: Float!) {
          createInvoiceOrBillInXero(payment_claim_id: $paymentClaimId) {
            message
            status
          }
        }
      `,
      variables: postData,
      fetchPolicy: "no-cache",
    });
    const res = response?.data?.createInvoiceOrBillInXero;
    if (res?.status === ApiResponse.XERO_REFRESH && res?.message) {
      window.open(res.message, "_self");
      return null; // stop further flow
    }
    if (res?.status === ApiResponse.SUCCESS) {
      showSuccessToast(res?.message);
      setLoading && setLoading(false);
    } else {
      showErrorToast(res?.message);
      setLoading && setLoading(false);
    }
  } catch (error: any) {
    showErrorToast(error);
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
}

export async function CreatePaymentsInXero(
  postData: any,
  setLoading?: Function
): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation CreateInvoiceOrBillInXero($paymentClaimId: Float!) {
          createInvoiceOrBillInXero(payment_claim_id: $paymentClaimId) {
            message
            status
          }
        }
      `,
      variables: postData,
      fetchPolicy: "no-cache",
    });
    const res = response?.data?.createInvoiceOrBillInXero;
    if (res?.status === ApiResponse.XERO_REFRESH && res?.message) {
      window.open(res.message, "_self");
      return null; // stop further flow
    }
    if (res?.status === ApiResponse.SUCCESS) {
      showSuccessToast(res?.message);
      setLoading && setLoading(false);
    } else {
      showErrorToast(res?.message);
      setLoading && setLoading(false);
    }
  } catch (error: any) {
    showErrorToast(error);
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
}

export async function SkipContractMapping(
  postData: any,
  setLoading?: Function
): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation SkipContractMapping($companyId: Float!) {
          skipContractMapping(company_id: $companyId) {
            message
            status
          }
        }
      `,
      variables: postData,
      fetchPolicy: "no-cache",
    });
    if (response?.data?.skipContractMapping?.status === ApiResponse.SUCCESS) {
      showSuccessToast(response?.data?.skipContractMapping?.message);
      setLoading && setLoading(false);
    } else {
      showErrorToast(response?.data?.skipContractMapping?.message);
      setLoading && setLoading(false);
    }
  } catch (error: any) {
    showErrorToast(error);
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
}

export async function integrateAdatree(
  postData: any,
  setLoading?: Function
): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation IntegrateAdatree(
          $integrateAdatreeInput: integrateAdatreeInput!
        ) {
          integrateAdatree(integrateAdatreeInput: $integrateAdatreeInput) {
            message
            status
          }
        }
      `,
      variables: postData,
      fetchPolicy: "no-cache",
    });
    if (response?.data?.integrateAdatree?.status === ApiResponse.SUCCESS) {
      showSuccessToast(response?.data?.integrateAdatree?.message);
      setLoading && setLoading(false);
    } else {
      showErrorToast(response?.data?.integrateAdatree?.message);
      setLoading && setLoading(false);
    }
  } catch (error: any) {
    showErrorToast(error);
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
}

export const getXeroDashboardCountForCompany = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query GetXeroDashboardCountForCompany($companyId: Float!) {
          getXeroDashboardCountForCompany(company_id: $companyId) {
            data {
              status
              status_count
              type
            }
            message
            status
          }
        }
      `,
      variables: data,
      fetchPolicy: "no-cache",
    });
    if (
      response?.data?.getXeroDashboardCountForCompany?.status ===
      ApiResponse.SUCCESS
    ) {
      return response?.data?.getXeroDashboardCountForCompany?.data || [];
    }
    if (
      response?.data?.getXeroDashboardCountForCompany?.status ===
      ApiResponse.ERROR
    ) {
      showErrorToast(response?.data?.getXeroDashboardCountForCompany?.message);
      return null;
    }
  } catch (error: any) {
    showErrorToast(ApiResponse.ERROR);
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};

export const xeroSyncLogs = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query Xero_logs($getXeroSyncLogsInput: GetXeroSyncLogsInput!) {
          getXeroSyncLogs(getXeroSyncLogsInput: $getXeroSyncLogsInput) {
            data {
              xero_logs {
                contract_id
                contract_name
                created_on
                description
                from_xero
                id
                integration_id
                log_template_id
                process
                project_id
                project_name
                reference {
                  paytradeId
                  xeroId
                }
                sync_id
                sync_status
                sync_type
              }
              total_count
              count
            }
            message
            status
          }
        }
      `,
      variables: data,
      fetchPolicy: "no-cache",
    });
    if (response?.data?.getXeroSyncLogs?.status === ApiResponse.SUCCESS) {
      return response?.data?.getXeroSyncLogs?.data || [];
    }
    if (response?.data?.getXeroSyncLogs?.status === ApiResponse.ERROR) {
      showErrorToast(response?.data?.getXeroSyncLogs?.message);
      return null;
    }
  } catch (error: any) {
    showErrorToast(ApiResponse.ERROR);
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};

export const viewXeroSyncLog = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query ViewXeroSyncLog($viewXeroSyncLogId: String!) {
          viewXeroSyncLog(id: $viewXeroSyncLogId) {
            data {
              contract_id
              contract_name
              created_on
              description
              dynamic_values
              error_code
              error_message
              from_xero
              history
              id
              important_checks
              information_required
              integration_id
              log_template_id
              new_records
              notification
              paytrade_details
              paytrade_id
              paytrade_records
              process
              project_id
              project_name
              reference {
                paytradeId
                xeroId
              }
              reference_id
              sync_id
              sync_status
              sync_type
              synced_records
              updated_records
              xero_details
              xero_id
              xero_records
              api_name
              api_payload
            }
            message
            status
          }
        }
      `,
      variables: data,
      fetchPolicy: "no-cache",
    });
    if (response?.data?.viewXeroSyncLog?.status === ApiResponse.SUCCESS) {
      return response?.data?.viewXeroSyncLog?.data || [];
    }
    if (response?.data?.viewXeroSyncLog?.status === ApiResponse.ERROR) {
      showErrorToast(response?.data?.viewXeroSyncLog?.message);
      return null;
    }
  } catch (error: any) {
    showErrorToast(ApiResponse.ERROR);
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};

export const updateSettings = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation UpdateSettings($updateSettingsInput: UpdateSettingsInput!) {
          updateSettings(updateSettingsInput: $updateSettingsInput) {
            message
            status
          }
        }
      `,
      variables: data,
      fetchPolicy: "no-cache",
    });
    if (response?.data?.updateSettings?.status === ApiResponse.SUCCESS) {
      showSuccessToast(response?.data?.updateSettings?.message);
    }
    if (response?.data?.updateSettings?.status === ApiResponse.ERROR) {
      showErrorToast(response?.data?.updateSettings?.message);
      return null;
    }
  } catch (error: any) {
    showErrorToast(ApiResponse.ERROR);
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};

export const getXeroAccountCodes = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query GetAccountCodes($getAccountCodesInput: GetAccountCodesInput!) {
          getAccountCodes(getAccountCodesInput: $getAccountCodesInput) {
            data {
              code
              id
              name
              status
              type
            }
            message
            status
          }
        }
      `,
      variables: data,
      fetchPolicy: "no-cache",
    });
    const res = response?.data?.getAccountCodes;
    if (res?.status === ApiResponse.XERO_REFRESH && res?.message) {
      window.open(res.message, "_self");
      return null; // stop further flow
    }
    if (res?.status === ApiResponse.SUCCESS) {
      return res?.data || [];
    }
  } catch (error: any) {
    showErrorToast(ApiResponse.ERROR);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};

export const getTaxRates = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query GetTaxRates($getTaxTypeInput: GetTaxTypeInput!) {
          getTaxRates(getTaxTypeInput: $getTaxTypeInput) {
            data {
              name
              status
              type
            }
            message
            status
          }
        }
      `,
      variables: data,
      fetchPolicy: "no-cache",
    });

    const res = response?.data?.getTaxRates;

    if (res?.status === ApiResponse.XERO_REFRESH && res?.message) {
      window.open(res.message, "_self");
      return null; // stop further flow
    }

    if (res?.status === ApiResponse.SUCCESS) {
      return res?.data || [];
    }
  } catch (error: any) {
    showErrorToast(ApiResponse.ERROR);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};

export const createTrackingCategory = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation CreateTrackingCategory(
          $categoryName: String!
          $companyId: Float!
        ) {
          createTrackingCategory(
            category_name: $categoryName
            company_id: $companyId
          ) {
            message
            status
          }
        }
      `,
      variables: data,
      fetchPolicy: "no-cache",
    });

    const res = response?.data?.createTrackingCategory;

    if (res?.status === ApiResponse.XERO_REFRESH && res?.message) {
      window.open(res.message, "_self");
      return null; // stop further flow
    }
    if (res?.status === ApiResponse.SUCCESS) {
      showSuccessToast(res?.message);
    } else {
      showErrorToast(res?.message);
    }
  } catch (error: any) {
    showErrorToast(ApiResponse.ERROR);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};

export async function addNewAccountApi(
  postData: any,
  setLoading?: Function
): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation CreateAccount($createAccountInput: CreateAccountInput!) {
          createAccount(createAccountInput: $createAccountInput) {
            message
            status
          }
        }
      `,
      variables: postData,
      fetchPolicy: "no-cache",
    });
    const res = response?.data?.createAccount;

    if (res?.status === ApiResponse.XERO_REFRESH && res?.message) {
      window.open(res.message, "_self");
      return null; // stop further flow
    }

    if (res?.status === ApiResponse.SUCCESS) {
      showSuccessToast(res?.message);
      setLoading && setLoading(false);
      return true;
    } else {
      showErrorToast(res?.message);
      setLoading && setLoading(false);
      return res?.message;
    }
  } catch (error: any) {
    showErrorToast(error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
}

export async function createTaxTypeApi(
  postData: any,
  setLoading?: Function
): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation CreateTaxRates($createTaxTypeInput: CreateTaxTypeInput!) {
          createTaxRates(createTaxTypeInput: $createTaxTypeInput) {
            message
            status
          }
        }
      `,
      variables: postData,
      fetchPolicy: "no-cache",
    });
    const res = response?.data?.createTaxRates;
    if (res?.status === ApiResponse.XERO_REFRESH && res?.message) {
      window.open(res.message, "_self");
      return null; // stop further flow
    }

    if (res?.status === ApiResponse.SUCCESS) {
      showSuccessToast(res?.message);
      setLoading && setLoading(false);
      return true;
    } else {
      showErrorToast(res?.message);
      setLoading && setLoading(false);
      return res?.message;
    }
  } catch (error: any) {
    showErrorToast(error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
}
