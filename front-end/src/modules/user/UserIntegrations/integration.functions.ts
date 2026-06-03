import { SUCCESS } from "@/app/message";
import { showErrorToast, showSuccessToast } from "@/components/Toaster";
import apolloClient from "@/network/apolloClient";
import { ApiResponse } from "@/shared/constant/messages";
import { gql } from "@apollo/client";
import { toast } from "react-toastify";

/**
 * Task #42 — Shared Xero re-OAuth signalling.
 *
 * Backend returns `ApiResponse.XERO_REFRESH` with the consent URL in
 * `message` whenever the refresh token is dead. The previous behaviour
 * was `window.open(res.message, "_self")` from ~50 data-fetching
 * helpers, which silently bounced the user to login.xero.com — usually
 * mid-edit, blanking forms. We now stash the URL and broadcast a
 * window event so the in-page `XeroReauthBanner` can render a CTA
 * instead, leaving the current page intact.
 */
export const XERO_REAUTH_EVENT = "xero-reauth-needed";
export const XERO_REAUTH_URL_KEY = "xeroReauthUrl";

export const handleXeroReauthRequired = (url?: string | null): null => {
  if (typeof window === "undefined") return null;
  try {
    if (url) {
      localStorage.setItem(XERO_REAUTH_URL_KEY, url);
    }
    window.dispatchEvent(
      new CustomEvent(XERO_REAUTH_EVENT, { detail: { url } }),
    );
  } catch (err) {
    // last-resort fallback: do NOT silently navigate. Log so we can see it.
    // eslint-disable-next-line no-console
    console.warn("handleXeroReauthRequired dispatch failed", err);
  }
  return null;
};

export const clearXeroReauthRequired = (): void => {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(XERO_REAUTH_URL_KEY);
  } catch {}
};

/**
 * Task #109 — Cross-app reauth probe used by `XeroReauthBanner` so the
 * banner shows on every screen (not only the integrations pages) the
 * moment the hourly Xero scheduler marks the company's integration as
 * needing re-auth. Returns `{ needs_reauth, reauth_url? }` and never
 * throws — a backend hiccup must never block the UI.
 */
export const fetchXeroReauthStatus = async (): Promise<{
  needs_reauth: boolean;
  reauth_url?: string | null;
} | null> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query GetXeroReauthStatus {
          getXeroReauthStatus {
            status
            message
            data {
              needs_reauth
              company_id
              tenant_name
              needs_reauth_since
              reauth_url
            }
          }
        }
      `,
      fetchPolicy: "no-cache",
    });
    const data = response?.data?.getXeroReauthStatus?.data;
    if (!data) return { needs_reauth: false };
    return {
      needs_reauth: !!data.needs_reauth,
      reauth_url: data.reauth_url || null,
    };
  } catch (err) {
    // Swallow — the banner stays in its current state on transient failures.
    return null;
  }
};

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
      handleXeroReauthRequired(res.message);
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
      handleXeroReauthRequired(res.message);
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
              bill_code_is_variable
              bill_code_naming_convention
              bill_code_allow_fallback
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
              retention_recording_mode
              retention_tax_type
              auto_gross_up_retention_journals
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
              smart_contact_auto_create
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
      handleXeroReauthRequired(res.message);
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

// Task #41 — Set/clear the per-supplier or per-(supplier × project) Xero
// account code override. Pass account_code = null/empty to clear an existing
// override. Pass project_id = null/undefined for the supplier-level default.
export const setSupplierXeroAccountCode = async (variables: {
  client_supplier_id: number;
  account_code?: string | null;
  project_id?: number | null;
}): Promise<{ ok: boolean; message?: string }> => {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation SetSupplierXeroAccountCode(
          $client_supplier_id: Float!
          $account_code: String
          $project_id: Float
        ) {
          setSupplierXeroAccountCode(
            client_supplier_id: $client_supplier_id
            account_code: $account_code
            project_id: $project_id
          ) {
            message
            status
          }
        }
      `,
      variables: {
        client_supplier_id: variables.client_supplier_id,
        account_code:
          variables.account_code === undefined ? null : variables.account_code,
        project_id:
          variables.project_id === undefined ? null : variables.project_id,
      },
      fetchPolicy: "no-cache",
    });
    const res = response?.data?.setSupplierXeroAccountCode;
    if (res?.status === ApiResponse.SUCCESS) {
      return { ok: true, message: res?.message };
    }
    if (res?.message) showErrorToast(res.message);
    return { ok: false, message: res?.message };
  } catch (error: any) {
    showErrorToast(ApiResponse.ERROR);
    return { ok: false };
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
              already_running
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
      handleXeroReauthRequired(res.message);
      return null; // stop further flow
    }
    if (res?.status === ApiResponse.SUCCESS) {
      // Task #135 — When the per-company sync lock is already held by
      // another in-flight run, the backend returns SUCCESS with an
      // `already_running` flag in `data` so the user sees a friendly
      // info toast instead of a noisy error.
      if (res?.data?.already_running) {
        toast.info(res.message);
        return res?.data;
      }
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

export const syncContactInformation = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation SyncContactInformation($companyId: Float!) {
          syncContactInformation(company_id: $companyId) {
            message
            status
          }
        }
      `,
      variables: data,
      fetchPolicy: "no-cache",
    });
    const res = response?.data?.syncContactInformation;
    if (res?.status === ApiResponse.XERO_REFRESH && res?.message) {
      handleXeroReauthRequired(res.message);
      return null;
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

export const syncContactFinancialDetails = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation SyncContactFinancialDetails($companyId: Float!) {
          syncContactFinancialDetails(company_id: $companyId) {
            message
            status
          }
        }
      `,
      variables: data,
      fetchPolicy: "no-cache",
    });
    const res = response?.data?.syncContactFinancialDetails;
    if (res?.status === ApiResponse.XERO_REFRESH && res?.message) {
      handleXeroReauthRequired(res.message);
      return null;
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
      handleXeroReauthRequired(res.message);
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

// Task #289 — Permanent unmap & re-enable for Xero contacts.
export const permanentlyUnmapContact = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation PermanentlyUnmapContact($contactId: String!) {
          permanentlyUnmapContact(contact_id: $contactId) {
            message
            status
          }
        }
      `,
      variables: data,
      fetchPolicy: "no-cache",
    });
    if (
      response?.data?.permanentlyUnmapContact?.status === ApiResponse.SUCCESS
    ) {
      showSuccessToast(response?.data?.permanentlyUnmapContact.message);
      return true;
    }
    if (response?.data?.permanentlyUnmapContact?.status === ApiResponse.ERROR) {
      showErrorToast(response?.data?.permanentlyUnmapContact.message);
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

// Task #291 — Bulk version of permanentlyUnmapContact.
export const permanentlyUnmapContactsBulk = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation PermanentlyUnmapContactsBulk($contactIds: [String!]!) {
          permanentlyUnmapContactsBulk(contact_ids: $contactIds) {
            message
            status
          }
        }
      `,
      variables: data,
      fetchPolicy: "no-cache",
    });
    if (
      response?.data?.permanentlyUnmapContactsBulk?.status === ApiResponse.SUCCESS
    ) {
      showSuccessToast(response?.data?.permanentlyUnmapContactsBulk.message);
      return true;
    }
    if (
      response?.data?.permanentlyUnmapContactsBulk?.status === ApiResponse.ERROR
    ) {
      showErrorToast(response?.data?.permanentlyUnmapContactsBulk.message);
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

export const reEnableContactMapping = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation ReEnableContactMapping($contactId: String!) {
          reEnableContactMapping(contact_id: $contactId) {
            message
            status
          }
        }
      `,
      variables: data,
      fetchPolicy: "no-cache",
    });
    if (
      response?.data?.reEnableContactMapping?.status === ApiResponse.SUCCESS
    ) {
      showSuccessToast(response?.data?.reEnableContactMapping.message);
      return true;
    }
    if (response?.data?.reEnableContactMapping?.status === ApiResponse.ERROR) {
      showErrorToast(response?.data?.reEnableContactMapping.message);
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
      handleXeroReauthRequired(res.message);
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

// Task #122 — Bulk-create all unmapped active Xero bank accounts in
// PayTrade. Mirrors `BatchCreateContactsInPaytrade`. Returns the full
// payload (counts + per-account errors) so the caller can render a
// breakdown alongside the toast.
export async function BatchCreateAccountsInPaytrade(
  postData: any,
  setLoading?: Function
): Promise<any> {
  try {
    // Task #123 — Pass the user-picked default account type and any
    // per-row overrides to the backend so the bulk-create can produce
    // trust-account rows (or stay on the default Cash Account fast
    // path when no overrides are provided).
    const response = await apolloClient.query({
      query: gql`
        mutation BatchCreateAccountsInPaytrade(
          $companyId: Float!
          $defaultAccountType: String
          $accountTypeOverrides: [BatchCreateAccountTypeOverrideInput!]
        ) {
          batchCreateAccountsInPaytrade(
            company_id: $companyId
            default_account_type: $defaultAccountType
            account_type_overrides: $accountTypeOverrides
          ) {
            data {
              created
              skipped
              failed
              errors {
                account_id
                account_name
                reason
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

    const payload = response?.data?.batchCreateAccountsInPaytrade;
    if (payload?.status === ApiResponse.SUCCESS) {
      showSuccessToast(payload?.message);
    } else {
      showErrorToast(payload?.message);
    }
    return payload?.data || null;
  } catch (error: any) {
    showErrorToast(error);
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
}

// Task #122 — Counts unmapped active Xero bank accounts eligible for
// bulk-create in PayTrade. Single source of truth shared with the
// backend batch loop so the dialog count and disabled-button state
// match what the batch will actually attempt.
export async function GetUnmappedActiveXeroAccountsCount(
  postData: any
): Promise<number> {
  try {
    const response = await apolloClient.query({
      query: gql`
        query GetUnmappedActiveXeroAccountsCount($companyId: Float!) {
          getUnmappedActiveXeroAccountsCount(company_id: $companyId) {
            data
            message
            status
          }
        }
      `,
      variables: postData,
      fetchPolicy: "no-cache",
    });
    const raw =
      response?.data?.getUnmappedActiveXeroAccountsCount?.data ?? "0";
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  } catch (error: any) {
    console.error("GraphQL Error:", error);
    return 0;
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
      handleXeroReauthRequired(res.message);
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
      handleXeroReauthRequired(res.message);
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
                needs_mapping
                needs_mapping_reason
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
      handleXeroReauthRequired(res.message);
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
      handleXeroReauthRequired(res.message);
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
      handleXeroReauthRequired(res.message);
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
      handleXeroReauthRequired(res.message);
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
// Task #134 — Self-service "Remove" for an orphaned Xero bank
// account cache row (e.g. a phantom row left over from the legacy
// Draft branch). Calls the matching backend mutation and surfaces
// the result via the standard toasts so the Xero Settings → Bank
// accounts table can refresh after the row is dropped.
export const removeXeroBankAccountCacheRow = async (
  data: { accountId: string },
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation RemoveXeroBankAccountCacheRow($accountId: String!) {
          removeXeroBankAccountCacheRow(account_id: $accountId) {
            message
            status
          }
        }
      `,
      variables: data,
      fetchPolicy: "no-cache",
    });
    if (
      response?.data?.removeXeroBankAccountCacheRow?.status ===
      ApiResponse.SUCCESS
    ) {
      showSuccessToast(response?.data?.removeXeroBankAccountCacheRow.message);
      return true;
    }
    if (
      response?.data?.removeXeroBankAccountCacheRow?.status ===
      ApiResponse.ERROR
    ) {
      showErrorToast(response?.data?.removeXeroBankAccountCacheRow.message);
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
      handleXeroReauthRequired(res.message);
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
      handleXeroReauthRequired(res.message);
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
      handleXeroReauthRequired(res.message);
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
      handleXeroReauthRequired(res.message);
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
                error_code
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

/**
 * Task #84 — claim-scoped sync log fetcher used as a "Filter by claim id"
 * shortcut on the standalone Sync Logs dashboard. Reuses the same query
 * that powers the per-claim Sync history table inside the Xero drawer.
 * Returns the raw row array (newest first, capped at 50) or [].
 */
export const xeroSyncLogsForClaim = async (
  payment_claim_id: number,
  setLoading?: Function
): Promise<any[]> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query GetXeroSyncLogsForClaim($payment_claim_id: Float!) {
          getXeroSyncLogsForClaim(payment_claim_id: $payment_claim_id) {
            status
            message
            data {
              id
              sync_id
              sync_type
              sync_status
              description
              process
              reference
              created_on
            }
          }
        }
      `,
      variables: { payment_claim_id },
      fetchPolicy: "no-cache",
    });
    const payload = response?.data?.getXeroSyncLogsForClaim;
    if (payload?.status === ApiResponse.SUCCESS) {
      return Array.isArray(payload?.data) ? payload.data : [];
    }
    if (payload?.status === ApiResponse.ERROR) {
      showErrorToast(payload?.message);
      return [];
    }
    return [];
  } catch (error: any) {
    showErrorToast(ApiResponse.ERROR);
    console.error("GraphQL Error:", error);
    return [];
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
              xero_deep_link
              paytrade_deep_link
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
      handleXeroReauthRequired(res.message);
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
      handleXeroReauthRequired(res.message);
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
      handleXeroReauthRequired(res.message);
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
      handleXeroReauthRequired(res.message);
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
      handleXeroReauthRequired(res.message);
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

/**
 * Task #65 — Manual Xero re-sync by ID.
 *
 * Calls the admin-only `manualXeroResync` mutation. Backend returns a
 * StringResponse whose `message` is JSON-stringified
 * `{ success, message, syncLogId, resolvedXeroId }`. We parse it here so
 * the caller can render an inline result panel without re-implementing
 * the JSON shape in every component.
 */
export const manualXeroResync = async (variables: {
  company_id: number;
  type: "invoice_bill" | "payment" | "bank_transfer" | "contact" | "manual_journal" | "trust_movement";
  id: string;
}): Promise<{
  success: boolean;
  message: string;
  syncLogId?: number | null;
  resolvedXeroId?: string | null;
  direction?: string;
}> => {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation ManualXeroResync($company_id: Float!, $type: String!, $id: String!) {
          manualXeroResync(company_id: $company_id, type: $type, id: $id) {
            message
            status
          }
        }
      `,
      variables,
      fetchPolicy: "no-cache",
    });
    const res = response?.data?.manualXeroResync;
    if (res?.status === ApiResponse.XERO_REFRESH && res?.message) {
      handleXeroReauthRequired(res.message);
      return { success: false, message: "Xero re-authentication required." };
    }
    let parsed: any = null;
    try {
      parsed = JSON.parse(res?.message ?? "{}");
    } catch {
      parsed = { success: res?.status === ApiResponse.SUCCESS, message: res?.message };
    }
    if (parsed?.success) {
      showSuccessToast(parsed?.message || "Manual sync triggered");
    } else {
      showErrorToast(parsed?.message || "Manual sync failed");
    }
    return parsed;
  } catch (error: any) {
    const msg = error?.message || ApiResponse.ERROR;
    showErrorToast(msg);
    return { success: false, message: msg };
  }
};

/**
 * Task #267 — One-click "Clean up archived-contact failures".
 *
 * Calls the admin-only `recoverArchivedContactSyncLogs` mutation. The
 * backend returns a StringResponse whose `message` is JSON-stringified
 * `{ success, message, scanned, updated, skipped, sample_sync_ids }`.
 * Used for both the dry-run preview (count first) and the real sweep,
 * which is why we suppress the success toast on dry runs — the dialog
 * shows the preview inline.
 */
export const recoverArchivedContactSyncLogs = async (variables: {
  company_id: number;
  dry_run?: boolean;
}): Promise<{
  success: boolean;
  message: string;
  scanned?: number;
  updated?: number;
  skipped?: number;
  sample_sync_ids?: Array<string | number>;
}> => {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation RecoverArchivedContactSyncLogs(
          $company_id: Float!
          $dry_run: Boolean
        ) {
          recoverArchivedContactSyncLogs(
            company_id: $company_id
            dry_run: $dry_run
          ) {
            message
            status
          }
        }
      `,
      variables,
      fetchPolicy: "no-cache",
    });
    const res = response?.data?.recoverArchivedContactSyncLogs;
    if (res?.status === ApiResponse.XERO_REFRESH && res?.message) {
      handleXeroReauthRequired(res.message);
      return { success: false, message: "Xero re-authentication required." };
    }
    let parsed: any = null;
    try {
      parsed = JSON.parse(res?.message ?? "{}");
    } catch {
      parsed = {
        success: res?.status === ApiResponse.SUCCESS,
        message: res?.message,
      };
    }
    if (!variables.dry_run) {
      if (parsed?.success) {
        showSuccessToast(parsed?.message || "Sweep complete");
      } else {
        showErrorToast(parsed?.message || "Sweep failed");
      }
    } else if (!parsed?.success) {
      showErrorToast(parsed?.message || "Preview failed");
    }
    return parsed;
  } catch (error: any) {
    const msg = error?.message || ApiResponse.ERROR;
    showErrorToast(msg);
    return { success: false, message: msg };
  }
};

/**
 * Archive (or un-archive) one or more Xero sync log rows.
 *
 * Archived rows stay in the database for audit but are excluded from
 * the default Synced/Warning/Issues counters and table view. The
 * backend returns `{ success, affected, rejected }` JSON-stringified
 * inside `message`; we parse and return the structured shape so the
 * UI can show a summary toast ("12 archived, 1 skipped").
 */
export const archiveXeroSyncLogs = async (variables: {
  ids: string[];
  company_id: number;
  note?: string | null;
  mode: "archive" | "unarchive";
}): Promise<{ success: boolean; affected: number; rejected: number; message?: string }> => {
  const mutationName =
    variables.mode === "archive" ? "archiveXeroSyncLogs" : "unarchiveXeroSyncLogs";
  const opName =
    variables.mode === "archive" ? "ArchiveXeroSyncLogs" : "UnarchiveXeroSyncLogs";
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation ${opName}($input: ArchiveSyncLogsInput!) {
          ${mutationName}(input: $input) {
            message
            status
          }
        }
      `,
      variables: {
        input: {
          ids: variables.ids,
          company_id: variables.company_id,
          note: variables.note ?? null,
        },
      },
      fetchPolicy: "no-cache",
    });
    const res = response?.data?.[mutationName];
    let parsed: any = {};
    try {
      parsed = JSON.parse(res?.message ?? "{}");
    } catch {
      parsed = { success: res?.status === ApiResponse.SUCCESS, message: res?.message };
    }
    if (res?.status !== ApiResponse.SUCCESS || !parsed?.success) {
      showErrorToast(parsed?.message || `Failed to ${variables.mode} sync logs`);
      return {
        success: false,
        affected: parsed?.affected ?? 0,
        rejected: parsed?.rejected ?? variables.ids.length,
        message: parsed?.message,
      };
    }
    const verb = variables.mode === "archive" ? "archived" : "un-archived";
    const skipped = parsed?.rejected ?? 0;
    const summary =
      skipped > 0
        ? `${parsed.affected} ${verb}, ${skipped} skipped`
        : `${parsed.affected} ${verb}`;
    showSuccessToast(summary);
    return {
      success: true,
      affected: parsed.affected ?? 0,
      rejected: parsed.rejected ?? 0,
    };
  } catch (error: any) {
    const msg = error?.message || ApiResponse.ERROR;
    showErrorToast(msg);
    return { success: false, affected: 0, rejected: variables.ids.length, message: msg };
  }
};

/**
 * Task #72 — Lookup helper for the Manual Xero Re-sync widget.
 *
 * Returns up to 10 candidate Xero records for the chosen type filtered
 * by a free-text hint. Silent on error (no toast) — the dialog renders
 * the error message inline so it doesn't compete with the user's typing.
 */
export const manualXeroResyncLookup = async (variables: {
  company_id: number;
  type: "invoice_bill" | "payment" | "bank_transfer" | "contact" | "manual_journal" | "trust_movement";
  hint: string;
  from_date?: string | null;
  to_date?: string | null;
  page?: number | null;
  account_hint?: string;
  date?: string;
}): Promise<{
  success: boolean;
  message?: string;
  candidates: Array<{ id: string; label: string; sublabel?: string }>;
  has_more?: boolean;
  page?: number;
  window?: { from?: string; to?: string };
}> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query ManualXeroResyncLookup(
          $company_id: Float!
          $type: String!
          $hint: String!
          $from_date: String
          $to_date: String
          $page: Int
          $account_hint: String
          $date: String
        ) {
          manualXeroResyncLookup(
            company_id: $company_id
            type: $type
            hint: $hint
            from_date: $from_date
            to_date: $to_date
            page: $page
            account_hint: $account_hint
            date: $date
          ) {
            message
            status
          }
        }
      `,
      variables: {
        ...variables,
        hint: variables.hint ?? "",
        account_hint: variables.account_hint ?? null,
        date: variables.date ?? null,
      },
      fetchPolicy: "no-cache",
    });
    const res = response?.data?.manualXeroResyncLookup;
    if (res?.status === ApiResponse.XERO_REFRESH && res?.message) {
      handleXeroReauthRequired(res.message);
      return {
        success: false,
        message: "Xero re-authentication required.",
        candidates: [],
      };
    }
    let parsed: any = null;
    try {
      parsed = JSON.parse(res?.message ?? "{}");
    } catch {
      parsed = { success: false, message: res?.message, candidates: [] };
    }
    return {
      success: !!parsed?.success,
      message: parsed?.message,
      candidates: Array.isArray(parsed?.candidates) ? parsed.candidates : [],
      has_more: !!parsed?.has_more,
      page: parsed?.page,
      window: parsed?.window,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || ApiResponse.ERROR,
      candidates: [],
    };
  }
};

/**
 * Task #136 — PayTrade-side picker for the two-sided manual sync dialog.
 * Mirrors `manualXeroResyncLookup` but searches PT entities only.
 */
export const manualXeroPaytradeLookup = async (variables: {
  company_id: number;
  type: "invoice_bill" | "payment" | "bank_transfer" | "contact" | "manual_journal" | "trust_movement";
  hint: string;
}): Promise<{
  success: boolean;
  message?: string;
  candidates: Array<{ id: string; label: string; sublabel?: string }>;
}> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query ManualXeroPaytradeLookup(
          $company_id: Float!
          $type: String!
          $hint: String!
        ) {
          manualXeroPaytradeLookup(
            company_id: $company_id
            type: $type
            hint: $hint
          ) {
            message
            status
          }
        }
      `,
      variables,
      fetchPolicy: "no-cache",
    });
    const res = response?.data?.manualXeroPaytradeLookup;
    let parsed: any = null;
    try {
      parsed = JSON.parse(res?.message ?? "{}");
    } catch {
      parsed = { success: false, message: res?.message, candidates: [] };
    }
    return {
      success: !!parsed?.success,
      message: parsed?.message,
      candidates: Array.isArray(parsed?.candidates) ? parsed.candidates : [],
    };
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || ApiResponse.ERROR,
      candidates: [],
    };
  }
};

/**
 * Task #136 — Pre-flight inspection for the two-sided manual sync dialog.
 * Returns shape, mapping, payment-status / reconciliation checks, the
 * recommended direction and a signed action token Run sync must echo.
 */
export const manualXeroPreflight = async (variables: {
  company_id: number;
  type: "invoice_bill" | "payment" | "bank_transfer" | "contact" | "manual_journal" | "trust_movement";
  xero_id?: string | null;
  pt_id?: string | null;
}): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query ManualXeroPreflight(
          $company_id: Float!
          $type: String!
          $xero_id: String
          $pt_id: String
        ) {
          manualXeroPreflight(
            company_id: $company_id
            type: $type
            xero_id: $xero_id
            pt_id: $pt_id
          ) {
            message
            status
          }
        }
      `,
      variables: {
        company_id: variables.company_id,
        type: variables.type,
        xero_id: variables.xero_id || null,
        pt_id: variables.pt_id || null,
      },
      fetchPolicy: "no-cache",
    });
    const res = response?.data?.manualXeroPreflight;
    if (res?.status === ApiResponse.XERO_REFRESH && res?.message) {
      handleXeroReauthRequired(res.message);
      return { success: false, message: "Xero re-authentication required." };
    }
    let parsed: any = null;
    try {
      parsed = JSON.parse(res?.message ?? "{}");
    } catch {
      parsed = { success: false, message: res?.message };
    }
    return parsed;
  } catch (error: any) {
    return { success: false, message: error?.message || ApiResponse.ERROR };
  }
};

/**
 * Task #147 — Catch-up discovery for the Manual Xero Sync dialog.
 * Read-only: returns every PT-side and Xero-side record in the chosen
 * date window, each with a per-row classification the dialog uses to
 * batch-drive the existing per-row preflight + run-sync calls.
 */
export type CatchupRowClassification =
  | "already_in_sync"
  | "needs_link"
  | "amounts_disagree"
  | "needs_push"
  | "needs_import"
  | "blocked";

export interface CatchupRow {
  key: string;
  classification: CatchupRowClassification;
  type: string;
  pt_id: string | null;
  xero_id: string | null;
  label: string;
  sublabel?: string;
  hint?: string;
  pt_summary?: string;
  xero_summary?: string;
  pt_details?: Array<{ label: string; value: string }>;
  xero_details?: Array<{ label: string; value: string }>;
  project_name?: string | null;
  contract_name?: string | null;
  xero_tracking_option_name?: string | null;
  xero_tracking_option_id?: string | null;
  xero_deep_link?: string | null;
  paytrade_deep_link?: string | null;
  // Task #151 follow-up — cheap in-memory pre-checks surfaced at
  // discovery time. Rendered verbatim as orange warning chips
  // under the Xero side cell. Rows with issues are still
  // selectable; the operator chooses whether to attempt sync.
  blocking_issues?: string[];
  // Task #151 follow-up — per-line validation against the
  // operator's configured Xero settings (Invoice/Bill account
  // code + tax code). Rendered as a dedicated "Settings match"
  // panel at the top of the row-detail dialog so the operator
  // can see WHY a Xero record qualifies as importable.
  validation_checks?: string[];
  // Task #152 — derived chip state shown as a column on the catch-up
  // table. `fail` means run-sync will block / error (typically a
  // missing or unresolvable account code on a Xero bill);
  // `warning` means operator should review (mismatch on outbound, or
  // tax code drift); `ok` means all configured codes line up.
  settings_match?: "ok" | "warning" | "fail";
}

export const manualXeroCatchupDiscover = async (variables: {
  company_id: number;
  type: "invoice_bill" | "payment" | "contact" | "trust_movement";
  from_date: string;
  to_date: string;
}): Promise<{
  success: boolean;
  message?: string;
  type?: string;
  from_date?: string;
  to_date?: string;
  rows?: CatchupRow[];
  counts?: Record<string, number>;
  notes?: {
    xero_skipped_no_tracking?: number;
    xero_total_in_window?: number;
    tracking_map_projects?: number;
    tracking_map_contracts?: number;
    [key: string]: any;
  };
  truncated?: boolean;
}> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query ManualXeroCatchupDiscover(
          $company_id: Float!
          $type: String!
          $from_date: String!
          $to_date: String!
        ) {
          manualXeroCatchupDiscover(
            company_id: $company_id
            type: $type
            from_date: $from_date
            to_date: $to_date
          ) {
            message
            status
          }
        }
      `,
      variables,
      fetchPolicy: "no-cache",
    });
    const res = response?.data?.manualXeroCatchupDiscover;
    if (res?.status === ApiResponse.XERO_REFRESH && res?.message) {
      handleXeroReauthRequired(res.message);
      return { success: false, message: "Xero re-authentication required." };
    }
    let parsed: any = null;
    try {
      parsed = JSON.parse(res?.message ?? "{}");
    } catch {
      parsed = { success: false, message: res?.message };
    }
    return parsed;
  } catch (error: any) {
    return { success: false, message: error?.message || ApiResponse.ERROR };
  }
};

/**
 * Task #136 — Two-sided manual Xero sync runner. Calls
 * `manualXeroTwoSidedSync`, which validates the preflight action token and
 * dispatches the chosen direction (import / push / link).
 */
export const manualXeroTwoSidedSync = async (variables: {
  company_id: number;
  type: "invoice_bill" | "payment" | "bank_transfer" | "contact" | "manual_journal" | "trust_movement";
  xero_id?: string | null;
  pt_id?: string | null;
  action_token: string;
  reviewed: boolean;
  preflight_snapshot_json?: string | null;
}): Promise<{
  success: boolean;
  message: string;
  syncLogId?: number | null;
  resolvedXeroId?: string | null;
  direction?: string;
}> => {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation ManualXeroTwoSidedSync(
          $company_id: Float!
          $type: String!
          $action_token: String!
          $reviewed: Boolean!
          $xero_id: String
          $pt_id: String
          $preflight_snapshot_json: String
        ) {
          manualXeroTwoSidedSync(
            company_id: $company_id
            type: $type
            action_token: $action_token
            reviewed: $reviewed
            xero_id: $xero_id
            pt_id: $pt_id
            preflight_snapshot_json: $preflight_snapshot_json
          ) {
            message
            status
          }
        }
      `,
      variables: {
        company_id: variables.company_id,
        type: variables.type,
        action_token: variables.action_token,
        reviewed: variables.reviewed,
        xero_id: variables.xero_id || null,
        pt_id: variables.pt_id || null,
        preflight_snapshot_json: variables.preflight_snapshot_json || null,
      },
      fetchPolicy: "no-cache",
    });
    const res = response?.data?.manualXeroTwoSidedSync;
    if (res?.status === ApiResponse.XERO_REFRESH && res?.message) {
      handleXeroReauthRequired(res.message);
      return { success: false, message: "Xero re-authentication required." };
    }
    let parsed: any = null;
    try {
      parsed = JSON.parse(res?.message ?? "{}");
    } catch {
      parsed = {
        success: res?.status === ApiResponse.SUCCESS,
        message: res?.message,
      };
    }
    if (parsed?.success) {
      showSuccessToast(parsed?.message || "Manual sync triggered");
    } else {
      showErrorToast(parsed?.message || "Manual sync failed");
    }
    return parsed;
  } catch (error: any) {
    const msg = error?.message || ApiResponse.ERROR;
    showErrorToast(msg);
    return { success: false, message: msg };
  }
};
